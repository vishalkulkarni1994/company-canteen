using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CanteenApi.Services;

namespace CanteenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AnalyticsController(AnalyticsService analyticsService) : ControllerBase
{
    [HttpPost("query")]
    public async Task<IActionResult> Query([FromBody] AnalyticsQuery req)
    {
        if (string.IsNullOrWhiteSpace(req.Question))
            return BadRequest(new { message = "Question cannot be empty" });

        try
        {
            var result = await analyticsService.QueryAsync(req.Question);
            return Ok(result);
        }
        catch (Exception)
        {
            return Ok(new AnalyticsResult { Error = "Something went wrong. Please try again." });
        }
    }
}

public record AnalyticsQuery(string Question);
