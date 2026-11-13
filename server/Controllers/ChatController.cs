using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CanteenApi.Services;
using CanteenApi.Extensions;

namespace CanteenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController(ChatService chatService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Chat([FromBody] ChatRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Message))
            return BadRequest(new { message = "Message cannot be empty" });

        var userId = User.GetUserId();
        var companyId = User.GetCompanyId();
        if (companyId is null)
            return BadRequest(new { message = "Chat requires a company context" });

        var reply = await chatService.SendMessage(req.Message, userId, companyId.Value, req.History);
        return Ok(new ChatResponse(reply));
    }

    [HttpPost("stream")]
    public async Task Stream([FromBody] ChatRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Message))
        {
            Response.StatusCode = 400;
            return;
        }

        var userId = User.GetUserId();
        var companyId = User.GetCompanyId();
        if (companyId is null)
        {
            Response.StatusCode = 400;
            return;
        }

        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        var ct = HttpContext.RequestAborted;

        try
        {
            await foreach (var evt in chatService.SendMessageStream(
                req.Message, userId, companyId.Value, req.History, ct))
            {
                var json = evt.Type switch
                {
                    StreamEventType.TextDelta => JsonSerializer.Serialize(
                        new { type = "text", text = evt.Text }),
                    StreamEventType.ToolStart => JsonSerializer.Serialize(
                        new { type = "tool_start", tool = evt.ToolName }),
                    StreamEventType.ToolDone => JsonSerializer.Serialize(
                        new { type = "tool_done", tool = evt.ToolName }),
                    _ => null
                };

                if (json == null) continue;

                await Response.WriteAsync($"data: {json}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }

            await Response.WriteAsync("data: [DONE]\n\n", ct);
            await Response.Body.FlushAsync(ct);
        }
        catch (OperationCanceledException) { }
        catch (Exception)
        {
            var error = JsonSerializer.Serialize(new { type = "error", text = "Something went wrong." });
            await Response.WriteAsync($"data: {error}\n\n", CancellationToken.None);
            await Response.Body.FlushAsync(CancellationToken.None);
        }
    }
}
