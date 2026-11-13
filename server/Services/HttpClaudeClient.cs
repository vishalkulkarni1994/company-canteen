using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CanteenApi.Services;

// ────────────────────────────────────────────────────────────────────────────
// RAW HTTP implementation of IClaudeMessageClient.
//
// How it works:
//   1. Builds the JSON request body manually
//   2. POSTs to https://api.anthropic.com/v1/messages
//   3. Parses the JSON response into ClaudeResponse DTOs
//
// Pros:  No extra NuGet packages, full control over the wire format
// Cons:  Must handle headers, errors, and JSON parsing ourselves
//
// This is the DEFAULT implementation (UseSdk = false in appsettings.json).
// ────────────────────────────────────────────────────────────────────────────

public class HttpClaudeClient(
    IConfiguration config,
    IHttpClientFactory httpFactory,
    ILogger<HttpClaudeClient> logger) : IClaudeMessageClient
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<ClaudeResponse> SendAsync(
        ClaudeAgentDefinition agentDef,
        List<object> messages,
        CancellationToken ct = default)
    {
        // ── Step 1: Read API key from configuration ──
        var apiKey = config["Claude:ApiKey"]
            ?? throw new InvalidOperationException("Claude API key is not configured.");

        // ── Step 2: Build HTTP request with required headers ──
        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Add("x-api-key", apiKey);
        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        // ── Step 3: Serialize the request body ──
        //   The SnakeCaseLower policy converts C# PascalCase → API snake_case
        //   e.g. maxTokens → max_tokens, inputSchema → input_schema
        var body = new
        {
            model = agentDef.Model,
            max_tokens = agentDef.MaxTokens,
            system = agentDef.SystemPrompt,
            tools = agentDef.Tools,
            messages
        };

        var json = JsonSerializer.Serialize(body, JsonOpts);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // ── Step 4: POST to Claude Messages API ──
        var sw = Stopwatch.StartNew();
        var resp = await client.PostAsync("https://api.anthropic.com/v1/messages", content, ct);
        sw.Stop();

        var responseBody = await resp.Content.ReadAsStringAsync(ct);

        if (!resp.IsSuccessStatusCode)
        {
            logger.LogError("[HttpClient] ApiError. Status={S} Body={B}", (int)resp.StatusCode, responseBody);
            throw new Exception($"Claude API error: {resp.StatusCode} - {responseBody}");
        }

        logger.LogDebug("[HttpClient] ApiCall. DurationMs={D}", sw.ElapsedMilliseconds);

        // ── Step 5: Parse JSON response into our DTOs ──
        var root = JsonDocument.Parse(responseBody).RootElement;
        return MapResponse(root);
    }

    public async IAsyncEnumerable<ClaudeStreamEvent> SendStreamAsync(
        ClaudeAgentDefinition agentDef,
        List<object> messages,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var apiKey = config["Claude:ApiKey"]
            ?? throw new InvalidOperationException("Claude API key is not configured.");

        var httpClient = httpFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
        httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

        var body = new
        {
            model = agentDef.Model,
            max_tokens = agentDef.MaxTokens,
            system = agentDef.SystemPrompt,
            tools = agentDef.Tools,
            messages,
            stream = true
        };

        var json = JsonSerializer.Serialize(body, JsonOpts);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var request = new HttpRequestMessage(HttpMethod.Post,
            "https://api.anthropic.com/v1/messages") { Content = content };

        using var resp = await httpClient.SendAsync(request,
            HttpCompletionOption.ResponseHeadersRead, ct);

        if (!resp.IsSuccessStatusCode)
        {
            var errorBody = await resp.Content.ReadAsStringAsync(ct);
            logger.LogError("[HttpClient] StreamError. Status={S} Body={B}",
                (int)resp.StatusCode, errorBody);
            throw new Exception($"Claude API error: {resp.StatusCode} - {errorBody}");
        }

        using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        var blocks = new List<ContentBlock>();
        var currentBlockType = "";
        var currentBlockId = "";
        var currentBlockName = "";
        var textAccumulator = new StringBuilder();
        var inputJsonAccumulator = new StringBuilder();
        string stopReason = "end_turn";
        long inputTokens = 0, outputTokens = 0;

        while (!reader.EndOfStream)
        {
            ct.ThrowIfCancellationRequested();
            var line = await reader.ReadLineAsync(ct);
            if (line == null) break;
            if (!line.StartsWith("data: ")) continue;

            var data = line["data: ".Length..];
            if (data == "[DONE]") break;

            JsonElement evt;
            try { evt = JsonDocument.Parse(data).RootElement; }
            catch { continue; }

            var evtType = evt.TryGetProperty("type", out var t) ? t.GetString() : null;

            switch (evtType)
            {
                case "content_block_start":
                    var cb = evt.GetProperty("content_block");
                    currentBlockType = cb.GetProperty("type").GetString()!;
                    if (currentBlockType == "tool_use")
                    {
                        currentBlockId = cb.GetProperty("id").GetString()!;
                        currentBlockName = cb.GetProperty("name").GetString()!;
                        inputJsonAccumulator.Clear();
                        yield return new ClaudeStreamEvent
                        {
                            Type = StreamEventType.ToolStart,
                            ToolName = currentBlockName
                        };
                    }
                    else
                    {
                        textAccumulator.Clear();
                    }
                    break;

                case "content_block_delta":
                    var delta = evt.GetProperty("delta");
                    var deltaType = delta.GetProperty("type").GetString();
                    if (deltaType == "text_delta")
                    {
                        var chunk = delta.GetProperty("text").GetString()!;
                        textAccumulator.Append(chunk);
                        yield return new ClaudeStreamEvent
                        {
                            Type = StreamEventType.TextDelta,
                            Text = chunk
                        };
                    }
                    else if (deltaType == "input_json_delta")
                    {
                        var partial = delta.GetProperty("partial_json").GetString()!;
                        inputJsonAccumulator.Append(partial);
                    }
                    break;

                case "content_block_stop":
                    if (currentBlockType == "text")
                    {
                        blocks.Add(new ContentBlock
                        {
                            Type = "text",
                            Text = textAccumulator.ToString()
                        });
                    }
                    else if (currentBlockType == "tool_use")
                    {
                        var inputJson = inputJsonAccumulator.ToString();
                        var inputElement = string.IsNullOrEmpty(inputJson)
                            ? JsonDocument.Parse("{}").RootElement
                            : JsonDocument.Parse(inputJson).RootElement;
                        blocks.Add(new ContentBlock
                        {
                            Type = "tool_use",
                            Id = currentBlockId,
                            Name = currentBlockName,
                            Input = inputElement
                        });
                    }
                    break;

                case "message_delta":
                    if (evt.TryGetProperty("delta", out var md)
                        && md.TryGetProperty("stop_reason", out var sr))
                        stopReason = sr.GetString() ?? "end_turn";
                    if (evt.TryGetProperty("usage", out var u)
                        && u.TryGetProperty("output_tokens", out var ot))
                        outputTokens = ot.GetInt64();
                    break;

                case "message_start":
                    if (evt.TryGetProperty("message", out var msg)
                        && msg.TryGetProperty("usage", out var mu)
                        && mu.TryGetProperty("input_tokens", out var it))
                        inputTokens = it.GetInt64();
                    break;
            }
        }

        yield return new ClaudeStreamEvent
        {
            Type = StreamEventType.RoundComplete,
            Response = new ClaudeResponse
            {
                StopReason = stopReason,
                Content = blocks,
                InputTokens = inputTokens,
                OutputTokens = outputTokens
            }
        };
    }

    /// <summary>
    /// Maps the raw JSON response from Claude into our ClaudeResponse DTO.
    ///
    /// Claude API response shape:
    /// {
    ///   "stop_reason": "end_turn" | "tool_use",
    ///   "content": [
    ///     { "type": "text", "text": "Hello!" },
    ///     { "type": "tool_use", "id": "toolu_...", "name": "get_today_menu", "input": {} }
    ///   ],
    ///   "usage": { "input_tokens": 100, "output_tokens": 50 }
    /// }
    /// </summary>
    private static ClaudeResponse MapResponse(JsonElement root)
    {
        var usage = root.GetProperty("usage");

        var blocks = root.GetProperty("content").EnumerateArray()
            .Select(block =>
            {
                var type = block.GetProperty("type").GetString()!;

                return new ContentBlock
                {
                    Type = type,
                    Text = type == "text" ? block.GetProperty("text").GetString() : null,
                    Id = type == "tool_use" ? block.GetProperty("id").GetString() : null,
                    Name = type == "tool_use" ? block.GetProperty("name").GetString() : null,
                    Input = type == "tool_use" ? block.GetProperty("input") : default
                };
            })
            .ToList();

        return new ClaudeResponse
        {
            StopReason = root.GetProperty("stop_reason").GetString()!,
            Content = blocks,
            InputTokens = usage.GetProperty("input_tokens").GetInt64(),
            OutputTokens = usage.GetProperty("output_tokens").GetInt64()
        };
    }
}
