using System.Text.Json;

namespace CanteenApi.Services;

// ────────────────────────────────────────────────────────────────────────────
// ANTHROPIC SDK implementation of IClaudeMessageClient.
//
// Prerequisites:
//   dotnet add package Anthropic.SDK
//
// How it works:
//   1. Creates an AnthropicClient with the API key
//   2. Builds a MessageParameters object with model, tools, messages
//   3. Calls client.Messages.GetClaudeMessageAsync(parameters)
//   4. Maps the typed SDK response into our ClaudeResponse DTOs
//
// Pros:  Typed objects, automatic header management, built-in error handling
// Cons:  Extra NuGet dependency, less visibility into raw wire format
//
// Enable this in appsettings.json:
//   "Claude": { "UseSdk": true }
// ────────────────────────────────────────────────────────────────────────────

// ┌─────────────────────────────────────────────────────────────────────────┐
// │  NOTE: This file requires the Anthropic.SDK NuGet package.             │
// │  Install it with:  dotnet add package Anthropic.SDK                    │
// │                                                                        │
// │  The code below shows the PATTERN for using the SDK.                   │
// │  Exact class/method names may vary by SDK version — check the          │
// │  package docs at https://github.com/tghamm/Anthropic.SDK              │
// └─────────────────────────────────────────────────────────────────────────┘

/*  ── UNCOMMENT THIS BLOCK AFTER INSTALLING Anthropic.SDK ──────────────────

using Anthropic.SDK;
using Anthropic.SDK.Messaging;

public class SdkClaudeClient(
    IConfiguration config,
    ILogger<SdkClaudeClient> logger) : IClaudeMessageClient
{
    public async Task<ClaudeResponse> SendAsync(
        ClaudeAgentDefinition agentDef,
        List<object> messages,
        CancellationToken ct = default)
    {
        // ── Step 1: Create the SDK client with API key ──
        //   The SDK handles the x-api-key header and anthropic-version internally
        var apiKey = config["Claude:ApiKey"]
            ?? throw new InvalidOperationException("Claude API key is not configured.");

        var client = new AnthropicClient(apiKey);

        // ── Step 2: Convert our generic messages to SDK message types ──
        //   The SDK uses typed Message objects instead of anonymous objects
        var sdkMessages = ConvertMessages(messages);

        // ── Step 3: Build the request parameters ──
        var parameters = new MessageParameters
        {
            Model = agentDef.Model,                           // "claude-haiku-5-5"
            MaxTokens = agentDef.MaxTokens,                   // 1024
            SystemMessage = agentDef.SystemPrompt,            // system prompt string
            Messages = sdkMessages,                           // List<Message>
            Tools = ConvertTools(agentDef.Tools),             // List<Tool>
        };

        // ── Step 4: Make the API call ──
        //   ONE LINE replaces our entire CallApiAsync method:
        //   - No manual header management
        //   - No JSON serialization
        //   - No error response parsing
        //   - Response is already typed (MessageResponse)
        var response = await client.Messages.GetClaudeMessageAsync(parameters, ct);

        logger.LogDebug("[SdkClient] ApiCall. Model={M} StopReason={S}",
            agentDef.Model, response.StopReason);

        // ── Step 5: Map SDK response to our DTOs ──
        //   Same ClaudeResponse/ContentBlock types that HttpClaudeClient returns
        return MapResponse(response);
    }

    /// <summary>
    /// Convert our List&lt;object&gt; messages (anonymous objects) to SDK Message types.
    /// The SDK expects typed Message objects with Role and Content properties.
    /// </summary>
    private static List<Message> ConvertMessages(List<object> messages)
    {
        // Serialize our anonymous objects to JSON, then deserialize as SDK types
        var json = JsonSerializer.Serialize(messages);
        return JsonSerializer.Deserialize<List<Message>>(json)
            ?? throw new InvalidOperationException("Failed to convert messages to SDK format.");
    }

    /// <summary>
    /// Convert our anonymous tool definition objects to SDK Tool types.
    /// </summary>
    private static List<Tool> ConvertTools(object[] tools)
    {
        var json = JsonSerializer.Serialize(tools);
        return JsonSerializer.Deserialize<List<Tool>>(json)
            ?? throw new InvalidOperationException("Failed to convert tools to SDK format.");
    }

    /// <summary>
    /// Map the SDK's typed MessageResponse into our shared ClaudeResponse DTO.
    /// Both HttpClaudeClient and SdkClaudeClient return the same type, so
    /// the agentic loop doesn't know or care which client made the call.
    /// </summary>
    private static ClaudeResponse MapResponse(MessageResponse response)
    {
        var blocks = new List<ContentBlock>();

        foreach (var block in response.Content)
        {
            if (block is TextContentBlock textBlock)
            {
                blocks.Add(new ContentBlock
                {
                    Type = "text",
                    Text = textBlock.Text
                });
            }
            else if (block is ToolUseContentBlock toolBlock)
            {
                blocks.Add(new ContentBlock
                {
                    Type = "tool_use",
                    Id = toolBlock.Id,
                    Name = toolBlock.Name,
                    Input = JsonSerializer.SerializeToElement(toolBlock.Input)
                });
            }
        }

        return new ClaudeResponse
        {
            StopReason = response.StopReason ?? "end_turn",
            Content = blocks,
            InputTokens = response.Usage?.InputTokens ?? 0,
            OutputTokens = response.Usage?.OutputTokens ?? 0
        };
    }
}

────────────────────────────────────────────────────────────────────────────── */

// ── PLACEHOLDER (compiles without the SDK package) ────────────────────────
// This lets the project build even when Anthropic.SDK is not installed.
// Remove this class and uncomment the block above after installing the SDK.

public class SdkClaudeClient(
    IConfiguration config,
    ILogger<SdkClaudeClient> logger) : IClaudeMessageClient
{
    public Task<ClaudeResponse> SendAsync(
        ClaudeAgentDefinition agentDef,
        List<object> messages,
        CancellationToken ct = default)
    {
        throw new InvalidOperationException(
            "SDK mode is enabled but Anthropic.SDK is not installed. " +
            "Run: dotnet add package Anthropic.SDK " +
            "then uncomment the SDK implementation in SdkClaudeClient.cs");
    }

    public IAsyncEnumerable<ClaudeStreamEvent> SendStreamAsync(
        ClaudeAgentDefinition agentDef,
        List<object> messages,
        CancellationToken ct = default)
    {
        throw new InvalidOperationException(
            "SDK mode is enabled but Anthropic.SDK is not installed.");
    }
}
