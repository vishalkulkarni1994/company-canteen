using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CanteenApi.Data;
using CanteenApi.Models;
using CanteenApi.Services;
using CanteenApi.Extensions;

namespace CanteenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(CanteenDbContext db, AuthService auth) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return Conflict(new { message = "Email already registered" });

        var company = await db.Companies.FindAsync(req.CompanyId);
        if (company is null)
            return BadRequest(new { message = "Invalid company" });

        var user = new User
        {
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Name = req.Name,
            CompanyId = req.CompanyId
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = auth.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Email, user.Name, user.Role, user.CompanyId, company.Name));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Email == req.Email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized();

        var token = auth.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Email, user.Name, user.Role, user.CompanyId, user.Company?.Name));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.GetUserId();
        var user = await db.Users
            .Include(u => u.Company)
            .FirstAsync(u => u.Id == userId);

        return Ok(new
        {
            email = user.Email,
            name = user.Name,
            role = user.Role,
            companyId = user.CompanyId,
            companyName = user.Company?.Name
        });
    }

    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies()
    {
        var companies = await db.Companies
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();

        return Ok(companies);
    }
}
