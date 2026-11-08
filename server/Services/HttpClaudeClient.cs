using System.Diagnostics;
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
