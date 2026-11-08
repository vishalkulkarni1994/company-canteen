using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CanteenApi.Services;

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

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var reply = await chatService.SendMessage(req.Message, userId, req.History);
        return Ok(new ChatResponse(reply));
    }
}
