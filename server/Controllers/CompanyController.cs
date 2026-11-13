using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CanteenApi.Data;
using CanteenApi.Models;

namespace CanteenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class CompanyController(CanteenDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var companies = await db.Companies
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.CreatedAt,
                UserCount = c.Users.Count(),
                MenuItemCount = c.MenuItems.Count(m => m.IsActive),
                TodayOrders = c.Orders.Count(o => o.CreatedAt.Date == DateTime.UtcNow.Date)
            })
            .ToListAsync();

        return Ok(companies);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCompanyRequest req)
    {
        if (await db.Companies.AnyAsync(c => c.Name == req.Name))
            return Conflict(new { message = "Company name already exists" });

        var company = new Company { Name = req.Name };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        return Created($"/api/company/{company.Id}", new { company.Id, company.Name, company.CreatedAt });
    }

    [HttpGet("{id}/users")]
    public async Task<IActionResult> GetCompanyUsers(int id)
    {
        var company = await db.Companies.FindAsync(id);
        if (company is null) return NotFound();

        var users = await db.Users
            .Where(u => u.CompanyId == id)
            .Select(u => new { u.Id, u.Email, u.Name, u.Role, u.CreatedAt })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("users/{userId}/role")]
    public async Task<IActionResult> UpdateUserRole(int userId, [FromBody] UpdateRoleRequest req)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        if (req.Role is not ("User" or "CompanyAdmin"))
            return BadRequest(new { message = "Role must be User or CompanyAdmin" });

        user.Role = req.Role;
        await db.SaveChangesAsync();

        return Ok(new { user.Id, user.Email, user.Name, user.Role });
    }
}

public record CreateCompanyRequest(string Name);
public record UpdateRoleRequest(string Role);
