using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Anthropic;
using Anthropic.Models.Messages;

namespace CanteenApi.Services;

public class ClaudeApiService(AnthropicClient client, ILogger<ClaudeApiService> logger)
{
    private const int MaxToolRounds = 10;

    private static readonly PropertyInfo? _propId =
        typeof(ToolUseBlock).GetProperty("ID")
        ?? typeof(ToolUseBlock).GetProperty("Id")
        ?? typeof(ToolUseBlock).GetProperty("id");
    private static readonly PropertyInfo? _propName =
        typeof(ToolUseBlock).GetProperty("Name")
        ?? typeof(ToolUseBlock).GetProperty("name");
    private static readonly PropertyInfo? _propInput =
        typeof(ToolUseBlock).GetProperty("Input")
        ?? typeof(ToolUseBlock).GetProperty("input");

    private static string GetToolUseId(ToolUseBlock b) =>
        _propId?.GetValue(b)?.ToString()
        ?? throw new InvalidOperationException("Cannot read ToolUseBlock.ID");
    private static string GetToolUseName(ToolUseBlock b) =>
        _propName?.GetValue(b)?.ToString()
        ?? throw new InvalidOperationException("Cannot read ToolUseBlock.Name");
    private static IReadOnlyDictionary<string, JsonElement>? GetToolUseInput(ToolUseBlock b) =>
        _propInput?.GetValue(b) as IReadOnlyDictionary<string, JsonElement>;

    public async Task<string> SendAsync(
        string query,
        ClaudeAgentDefinition agentDef,
        Func<string, JsonElement, Task<string>> dispatchTool,
        List<ChatMessage>? history = null,
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query))
                throw new ArgumentException("Query must not be empty.", nameof(query));

            var messages = new List<MessageParam>();
            if (history != null)
            {
                foreach (var msg in history)
                {
                    if (msg.Role == "user")
                        messages.Add(new UserMessageParam { Content = msg.Content });
                    else if (msg.Role == "assistant")
                        messages.Add(new AssistantMessageParam { Content = msg.Content });
                }
            }
            messages.Add(new UserMessageParam { Content = query });

            string result = string.Empty;
            long totalInput = 0, totalOutput = 0;
            var sw = Stopwatch.StartNew();

            for (var round = 0; round < MaxToolRounds; round++)
            {
                var response = await client.Messages.Create(new MessageCreateParams
                {
                    Model = agentDef.Model,
                    MaxTokens = agentDef.MaxTokens,
                    System = agentDef.SystemPrompt,
                    Tools = agentDef.Tools,
                    Messages = messages
                }, ct);

                var u = response.Usage;
                totalInput += u.InputTokens;
                totalOutput += u.OutputTokens;

                if (response.StopReason != "tool_use")
                {
                    var texts = new List<string>();
                    foreach (var block in response.Content)
                    {
                        if (block.TryPickText(out var tb))
                            texts.Add(tb.Text);
                    }
                    result = string.Join("\n", texts);
                    break;
                }

                var assistantBlocks = new List<ContentBlockParam>();
                foreach (var block in response.Content)
                {
                    if (block.TryPickText(out var tb))
                        assistantBlocks.Add(new TextBlockParam { Text = tb.Text });
                    else if (block.TryPickToolUse(out var tu))
                        assistantBlocks.Add(new ToolUseBlockParam
                        {
                            ID = GetToolUseId(tu),
                            Name = GetToolUseName(tu),
                            Input = GetToolUseInput(tu) ?? new Dictionary<string, JsonElement>()
                        });
                }
                messages.Add(new AssistantMessageParam { Content = assistantBlocks });

                var toolResults = new List<ContentBlockParam>();
                foreach (var block in response.Content)
                {
                    if (!block.TryPickToolUse(out var tu)) continue;
                    var toolId = GetToolUseId(tu);
                    var toolName = GetToolUseName(tu);

                    logger.LogInformation("[AgentLoop] ToolCall. Tool={Tool} Round={Round}",
                        toolName, round);

                    var inputJson = JsonSerializer.Serialize(GetToolUseInput(tu));
                    using var inputDoc = JsonDocument.Parse(inputJson);
                    var toolResult = await dispatchTool(toolName, inputDoc.RootElement);

                    logger.LogInformation("[AgentLoop] ToolResult. Tool={Tool} ResultLen={Len}",
                        toolName, toolResult.Length);

                    toolResults.Add(new ToolResultBlockParam
                    {
                        ToolUseID = toolId,
                        Content = toolResult,
                        IsError = false
                    });
                }
                messages.Add(new UserMessageParam { Content = toolResults });
            }

            sw.Stop();
            logger.LogInformation(
                "[AgentLoop] Complete. Model={Model} InputTokens={I} OutputTokens={O} DurationMs={D}",
                agentDef.Model, totalInput, totalOutput, sw.ElapsedMilliseconds);

            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[AgentLoop] SendAsync failed");
            return ex.Message;
        }
    }

    public async IAsyncEnumerable<ClaudeStreamEvent> SendStreamAsync(
        string query,
        ClaudeAgentDefinition agentDef,
        Func<string, JsonElement, Task<string>> dispatchTool,
        List<ChatMessage>? history = null,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var messages = new List<MessageParam>();
        if (history != null)
            foreach (var msg in history)
            {
                if (msg.Role == "user")
                    messages.Add(new UserMessageParam { Content = msg.Content });
                else if (msg.Role == "assistant")
                    messages.Add(new AssistantMessageParam { Content = msg.Content });
            }
        messages.Add(new UserMessageParam { Content = query });

        for (var round = 0; round < MaxToolRounds; round++)
        {
            var toolBlocks = new List<AccumulatedToolUse>();
            var textBlocks = new List<string>();
            string stopReason = "end_turn";
            var currentBlockType = "";
            var currentBlockId = "";
            var currentBlockName = "";
            var inputJsonAccumulator = new StringBuilder();
            var textAccumulator = new StringBuilder();

            var stream = client.Messages.CreateStreaming(new MessageCreateParams
            {
                Model = agentDef.Model,
                MaxTokens = agentDef.MaxTokens,
                System = agentDef.SystemPrompt,
                Tools = agentDef.Tools,
                Messages = messages
            }, ct);

            await foreach (var evt in stream)
            {
                if (evt.TryPickContentBlockStart(out var startEvt))
                {
                    if (startEvt.ContentBlock.TryPickToolUse(out var tu))
                    {
                        currentBlockType = "tool_use";
                        currentBlockId = GetToolUseId(tu);
                        currentBlockName = GetToolUseName(tu);
                        inputJsonAccumulator.Clear();
                        yield return new ClaudeStreamEvent
                        {
                            Type = StreamEventType.ToolStart,
                            ToolName = currentBlockName
                        };
                    }
                    else
                    {
                        currentBlockType = "text";
                        textAccumulator.Clear();
                    }
                }
                else if (evt.TryPickContentBlockDelta(out var deltaEvt))
                {
                    if (deltaEvt.Delta.TryPickText(out var textDelta))
                    {
                        textAccumulator.Append(textDelta.Text);
                        yield return new ClaudeStreamEvent
                        {
                            Type = StreamEventType.TextDelta,
                            Text = textDelta.Text
                        };
                    }
                    else if (deltaEvt.Delta.TryPickInputJson(out var jsonDelta))
                    {
                        inputJsonAccumulator.Append(jsonDelta.PartialJson);
                    }
                }
                else if (evt.TryPickContentBlockStop(out _))
                {
                    if (currentBlockType == "tool_use")
                    {
                        toolBlocks.Add(new AccumulatedToolUse
                        {
                            Id = currentBlockId,
                            Name = currentBlockName,
                            InputJson = inputJsonAccumulator.ToString()
                        });
                    }
                    else if (currentBlockType == "text")
                    {
                        textBlocks.Add(textAccumulator.ToString());
                    }
                }
                else if (evt.TryPickDelta(out var msgDelta))
                {
                    stopReason = "end_turn"; // default; check msgDelta for actual stop_reason
                }
                else if (evt.TryPickStop(out _))
                {
                    if (toolBlocks.Count > 0)
                        stopReason = "tool_use";
                }
            }

            if (stopReason != "tool_use")
                break;

            var assistantContent = new List<ContentBlockParam>();
            foreach (var text in textBlocks)
                assistantContent.Add(new TextBlockParam { Text = text });

            foreach (var tool in toolBlocks)
            {
                var parsedInput = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
                    string.IsNullOrEmpty(tool.InputJson) ? "{}" : tool.InputJson)
                    ?? new Dictionary<string, JsonElement>();
                assistantContent.Add(new ToolUseBlockParam
                {
                    ID = tool.Id,
                    Name = tool.Name,
                    Input = parsedInput
                });
            }
            messages.Add(new AssistantMessageParam { Content = assistantContent });

            var toolResults = new List<ContentBlockParam>();
            foreach (var tool in toolBlocks)
            {
                logger.LogInformation("[AgentLoop] ToolCall. Tool={Tool} Round={Round}",
                    tool.Name, round);

                using var inputDoc = JsonDocument.Parse(tool.InputJson ?? "{}");
                var toolResult = await dispatchTool(tool.Name, inputDoc.RootElement);

                yield return new ClaudeStreamEvent
                {
                    Type = StreamEventType.ToolDone,
                    ToolName = tool.Name
                };

                toolResults.Add(new ToolResultBlockParam
                {
                    ToolUseID = tool.Id,
                    Content = toolResult,
                    IsError = false
                });
            }
            messages.Add(new UserMessageParam { Content = toolResults });
        }
    }

    private sealed class AccumulatedToolUse
    {
        public required string Id { get; init; }
        public required string Name { get; init; }
        public string InputJson { get; init; } = "{}";
    }
}

public class ClaudeAgentDefinition
{
    public required string Model { get; init; }
    public required string SystemPrompt { get; init; }
    public int MaxTokens { get; init; } = 1024;
    public required IReadOnlyList<ToolUnion> Tools { get; init; }
}
