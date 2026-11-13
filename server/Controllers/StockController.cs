using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CanteenApi.Data;
using CanteenApi.Models;
using CanteenApi.Extensions;

namespace CanteenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StockController(CanteenDbContext db) : ControllerBase
{
    [HttpGet("today")]
    [Authorize]
    public async Task<IActionResult> GetToday()
    {
        var companyId = User.GetCompanyId();
        if (companyId is null && !User.IsSuperAdmin())
            return Forbid();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var query = db.DailyStocks
            .Include(s => s.MenuItem)
            .Where(s => s.Date == today && s.MenuItem.IsActive);

        if (!User.IsSuperAdmin())
            query = query.Where(s => s.MenuItem.CompanyId == companyId);

        var items = await query
            .OrderBy(s => s.MenuItem.Category).ThenBy(s => s.MenuItem.Name)
            .Select(s => new TodayStockResponse(
                s.Id,
                s.MenuItemId,
                s.MenuItem.Name,
                s.MenuItem.Description,
                s.MenuItem.Price,
                s.MenuItem.Category,
                s.MenuItem.ImageUrl,
                s.QuantityAvailable,
                s.QuantityOrdered,
                s.QuantityAvailable - s.QuantityOrdered))
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "CompanyAdmin,SuperAdmin")]
    public async Task<IActionResult> SetStock([FromBody] SetStockRequest req)
    {
        var item = await db.MenuItems.FindAsync(req.MenuItemId);
        if (item is null)
            return NotFound(new { message = "Menu item not found" });

        if (!User.IsSuperAdmin() && item.CompanyId != User.GetCompanyId())
            return Forbid();

        var existing = await db.DailyStocks
            .FirstOrDefaultAsync(s => s.MenuItemId == req.MenuItemId && s.Date == req.Date);

        if (existing is not null)
        {
            existing.QuantityAvailable = req.QuantityAvailable;
            await db.SaveChangesAsync();
            return Ok(existing);
        }

        var stock = new DailyStock
        {
            MenuItemId = req.MenuItemId,
            Date = req.Date,
            QuantityAvailable = req.QuantityAvailable
        };
        db.DailyStocks.Add(stock);
        await db.SaveChangesAsync();
        return Created($"/api/stock/{stock.Id}", stock);
    }

    [HttpPost("batch")]
    [Authorize(Roles = "CompanyAdmin,SuperAdmin")]
    public async Task<IActionResult> SetStockBatch([FromBody] SetStockRequest[] requests)
    {
        var companyId = User.GetCompanyId();

        foreach (var req in requests)
        {
            var item = await db.MenuItems.FindAsync(req.MenuItemId);
            if (item is null) continue;

            if (!User.IsSuperAdmin() && item.CompanyId != companyId)
                continue;

            var existing = await db.DailyStocks
                .FirstOrDefaultAsync(s => s.MenuItemId == req.MenuItemId && s.Date == req.Date);

            if (existing is not null)
            {
                existing.QuantityAvailable = req.QuantityAvailable;
            }
            else
            {
                db.DailyStocks.Add(new DailyStock
                {
                    MenuItemId = req.MenuItemId,
                    Date = req.Date,
                    QuantityAvailable = req.QuantityAvailable
                });
            }
        }

        await db.SaveChangesAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var query = db.DailyStocks
            .Include(s => s.MenuItem)
            .Where(s => s.Date == today && s.MenuItem.IsActive);

        if (!User.IsSuperAdmin())
            query = query.Where(s => s.MenuItem.CompanyId == companyId);

        var todayStock = await query
            .OrderBy(s => s.MenuItem.Category).ThenBy(s => s.MenuItem.Name)
            .Select(s => new TodayStockResponse(
                s.Id, s.MenuItemId, s.MenuItem.Name, s.MenuItem.Description,
                s.MenuItem.Price, s.MenuItem.Category, s.MenuItem.ImageUrl,
                s.QuantityAvailable, s.QuantityOrdered,
                s.QuantityAvailable - s.QuantityOrdered))
            .ToListAsync();

        return Ok(todayStock);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "CompanyAdmin,SuperAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var stock = await db.DailyStocks
            .Include(s => s.MenuItem)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (stock is null) return NotFound();

        if (!User.IsSuperAdmin() && stock.MenuItem.CompanyId != User.GetCompanyId())
            return Forbid();

        db.DailyStocks.Remove(stock);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
