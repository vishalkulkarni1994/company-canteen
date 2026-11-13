using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CanteenApi.Services;
using CanteenApi.Extensions;

namespace CanteenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "CompanyAdmin,SuperAdmin")]
public class AnalyticsController(AnalyticsService analyticsService) : ControllerBase
{
    [HttpPost("query")]
    public async Task<IActionResult> Query([FromBody] AnalyticsQuery req)
    {
        if (string.IsNullOrWhiteSpace(req.Question))
            return BadRequest(new { message = "Question cannot be empty" });

        var companyId = User.GetCompanyId();

        try
        {
            var result = await analyticsService.QueryAsync(req.Question, companyId);
            return Ok(result);
        }
        catch (Exception)
        {
            return Ok(new AnalyticsResult { Error = "Something went wrong. Please try again." });
        }
    }
}

public record AnalyticsQuery(string Question);
