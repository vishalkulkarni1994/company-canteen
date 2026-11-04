using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CanteenApi.Data;
using CanteenApi.Models;

namespace CanteenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MenuController(CanteenDbContext db) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll([FromQuery] string? category)
    {
        var query = db.MenuItems.Where(m => m.IsActive);
        if (!string.IsNullOrEmpty(category))
            query = query.Where(m => m.Category == category);

        var items = await query
            .OrderBy(m => m.Category).ThenBy(m => m.Name)
            .Select(m => new MenuItemResponse(
                m.Id, m.Name, m.Description, m.Price,
                m.Category, m.ImageUrl, m.IsActive,
                m.CreatedAt, m.UpdatedAt))
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null || !item.IsActive) return NotFound();

        return Ok(new MenuItemResponse(
            item.Id, item.Name, item.Description, item.Price,
            item.Category, item.ImageUrl, item.IsActive,
            item.CreatedAt, item.UpdatedAt));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateMenuItemRequest req)
    {
        var item = new MenuItem
        {
            Name = req.Name,
            Description = req.Description,
            Price = req.Price,
            Category = req.Category,
            ImageUrl = req.ImageUrl
        };
        db.MenuItems.Add(item);
        await db.SaveChangesAsync();

        var response = new MenuItemResponse(
            item.Id, item.Name, item.Description, item.Price,
            item.Category, item.ImageUrl, item.IsActive,
            item.CreatedAt, item.UpdatedAt);

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, response);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMenuItemRequest req)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return NotFound();

        if (req.Name is not null) item.Name = req.Name;
        if (req.Description is not null) item.Description = req.Description;
        if (req.Price.HasValue) item.Price = req.Price.Value;
        if (req.Category is not null) item.Category = req.Category;
        if (req.ImageUrl is not null) item.ImageUrl = req.ImageUrl;
        if (req.IsActive.HasValue) item.IsActive = req.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new MenuItemResponse(
            item.Id, item.Name, item.Description, item.Price,
            item.Category, item.ImageUrl, item.IsActive,
            item.CreatedAt, item.UpdatedAt));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return NotFound();

        item.IsActive = false;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return NoContent();
    }
}
