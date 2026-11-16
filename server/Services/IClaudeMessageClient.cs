namespace CanteenApi.Services;

public enum StreamEventType
{
    TextDelta,
    ToolStart,
    ToolDone,
    RoundComplete
}

public class ClaudeStreamEvent
{
    public required StreamEventType Type { get; init; }
    public string? Text { get; init; }
    public string? ToolName { get; init; }
}
