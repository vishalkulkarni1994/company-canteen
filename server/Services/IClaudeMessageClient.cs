using System.Text.Json;

namespace CanteenApi.Services;

// ────────────────────────────────────────────────────────────────────────────
// The contract for making a single Claude Messages API call.
//
// Two implementations exist:
//   HttpClaudeClient  — raw HttpClient  (no extra NuGet packages)
//   SdkClaudeClient   — Anthropic SDK   (needs: dotnet add package Anthropic.SDK)
//
// The agentic loop in ClaudeApiService doesn't care which one is behind
// this interface — it just calls SendAsync() and reads the response.
//
// Switch between them in appsettings.json:
//   "Claude": { "UseSdk": false }   ← raw HTTP (default)
//   "Claude": { "UseSdk": true  }   ← Anthropic SDK
// ────────────────────────────────────────────────────────────────────────────

public interface IClaudeMessageClient
{
    /// <summary>
    /// Make one API call to Claude's /v1/messages endpoint.
    /// The agentic loop calls this once per round.
    /// </summary>
    Task<ClaudeResponse> SendAsync(
        ClaudeAgentDefinition agentDef,
        List<object> messages,
        CancellationToken ct = default);
}

// ── Response DTOs ─────────────────────────────────────────────────────────
// Both HttpClaudeClient and SdkClaudeClient map their raw responses
// into these same types. The agentic loop works with these, never with
// raw JSON or SDK-specific types.

public class ClaudeResponse
{
    public required string StopReason { get; init; }
    public required List<ContentBlock> Content { get; init; }
    public long InputTokens { get; init; }
    public long OutputTokens { get; init; }
}

public class ContentBlock
{
    /// <summary>"text" or "tool_use"</summary>
    public required string Type { get; init; }

    /// <summary>The text content (only when Type == "text")</summary>
    public string? Text { get; init; }

    /// <summary>Tool call ID returned by Claude (only when Type == "tool_use")</summary>
    public string? Id { get; init; }

    /// <summary>Tool name Claude wants to call (only when Type == "tool_use")</summary>
    public string? Name { get; init; }

    /// <summary>Tool input arguments as JSON (only when Type == "tool_use")</summary>
    public JsonElement Input { get; init; }
}
