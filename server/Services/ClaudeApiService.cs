using System.Diagnostics;
using System.Text.Json;

namespace CanteenApi.Services;

// ────────────────────────────────────────────────────────────────────────────
// THE AGENTIC LOOP — the brain of the AI chat system.
//
// This service orchestrates multi-round conversations with Claude.
// It does NOT make HTTP calls or know about the SDK — that's the job of
// whichever IClaudeMessageClient is injected (HttpClaudeClient or SdkClaudeClient).
//
// Flow:
//   1. Build the messages array (history + new user message)
//   2. Call Claude via IClaudeMessageClient
//   3. If Claude wants to use tools → execute them, add results, go to step 2
//   4. If Claude is done → extract text and return
//
// The loop runs up to MaxToolRounds (10) times to prevent infinite loops.
// In practice, a typical menu-browse-and-order takes 2-3 rounds.
// ────────────────────────────────────────────────────────────────────────────

public class ClaudeApiService(IClaudeMessageClient client, ILogger<ClaudeApiService> logger)
{
    private const int MaxToolRounds = 10;

    /// <summary>
    /// Sends a user query to Claude and handles tool calls in a loop.
    /// Returns the final text response from Claude.
    /// </summary>
    /// <param name="query">The user's message</param>
    /// <param name="agentDef">Agent config: model, system prompt, tools</param>
    /// <param name="dispatchTool">Callback to execute tool calls (provided by ChatService)</param>
    /// <param name="history">Previous conversation messages (for multi-turn chat)</param>
    /// <param name="ct">Cancellation token</param>
    public async Task<string> SendAsync(
        string query,
        ClaudeAgentDefinition agentDef,
        Func<string, JsonElement, Task<string>> dispatchTool,
        List<ChatMessage>? history = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            throw new ArgumentException("Query must not be empty.", nameof(query));

        // ── STEP 1: Build the messages array ──
        //   Start with conversation history, then add the new user message.
        //   Claude needs the full conversation to maintain context.
        var messages = new List<object>();
        if (history != null)
        {
            foreach (var msg in history)
                messages.Add(new { role = msg.Role, content = msg.Content });
        }
        messages.Add(new { role = "user", content = query });

        string result = string.Empty;
        long totalInput = 0, totalOutput = 0;
        var sw = Stopwatch.StartNew();

        // ── STEP 2: The agentic loop ──
        //   Each iteration = one round-trip to Claude.
        //   Claude either responds with text (done) or asks to use tools (continue).
        for (var round = 0; round < MaxToolRounds; round++)
        {
            // Call Claude via whichever client is registered (HTTP or SDK).
            // The client returns the same ClaudeResponse DTO either way.
            var response = await client.SendAsync(agentDef, messages, ct);

            // Track token usage across all rounds
            totalInput += response.InputTokens;
            totalOutput += response.OutputTokens;

            // ── Check: Is Claude done or does it want to use tools? ──
            if (response.StopReason != "tool_use")
            {
                // Claude is done — extract all text blocks as the final answer
                result = string.Join("\n", response.Content
                    .Where(b => b.Type == "text")
                    .Select(b => b.Text));
                break;
            }

            // ── Claude wants to use tools — process them ──

            // First, add Claude's response (with tool_use blocks) to the conversation.
            // We serialize the content blocks back to objects for the messages array.
            messages.Add(new
            {
                role = "assistant",
                content = response.Content.Select(b => b.Type == "text"
                    ? (object)new { type = "text", text = b.Text }
                    : new { type = "tool_use", id = b.Id, name = b.Name, input = b.Input }
                ).ToArray()
            });

            // Then execute each tool call and collect results
            var toolResults = new List<object>();

            foreach (var block in response.Content.Where(b => b.Type == "tool_use"))
            {
                logger.LogInformation("[AgentLoop] ToolCall. Tool={Tool} Round={Round}",
                    block.Name, round);

                // Call the dispatchTool callback (provided by ChatService).
                // This is where canteen business logic runs (menu query, place order, etc.)
                var toolResult = await dispatchTool(block.Name!, block.Input);

                logger.LogInformation("[AgentLoop] ToolResult. Tool={Tool} ResultLen={Len}",
                    block.Name, toolResult.Length);

                // Wrap the result in the format Claude expects
                toolResults.Add(new
                {
                    type = "tool_result",
                    tool_use_id = block.Id,
                    content = toolResult
                });
            }

            // Add tool results as a "user" message — Claude's conversation protocol
            // requires tool results to come from the user role
            messages.Add(new { role = "user", content = toolResults.ToArray() });

            // Loop continues → next round sends everything back to Claude
        }

        // ── STEP 3: Post-loop logging ──
        sw.Stop();
        logger.LogInformation(
            "[AgentLoop] Complete. Model={Model} InputTokens={I} OutputTokens={O} DurationMs={D}",
            agentDef.Model, totalInput, totalOutput, sw.ElapsedMilliseconds);

        return result;
    }
}

// ── Agent definition ──────────────────────────────────────────────────────
// Holds everything needed to configure a Claude agent.
// ChatService creates one of these with the canteen-specific config.
// ClaudeApiService passes it to IClaudeMessageClient on every API call.

public class ClaudeAgentDefinition
{
    /// <summary>Claude model ID (e.g. "claude-haiku-5-5")</summary>
    public required string Model { get; init; }

    /// <summary>System prompt that defines the agent's personality and rules</summary>
    public required string SystemPrompt { get; init; }

    /// <summary>Max tokens in Claude's response (default 1024)</summary>
    public int MaxTokens { get; init; } = 1024;

    /// <summary>Tool definitions (JSON schema objects) Claude can call</summary>
    public required object[] Tools { get; init; }
}
