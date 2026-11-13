using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CanteenApi.Data;
using CanteenApi.Models;
using CanteenApi.Extensions;

namespace CanteenApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrderController(CanteenDbContext db) : ControllerBase
{
    private static readonly string[] ValidStatuses = ["Placed", "Preparing", "Ready", "Collected", "Cancelled"];
    private static readonly Dictionary<string, string[]> AllowedTransitions = new()
    {
        ["Placed"] = ["Preparing", "Cancelled"],
        ["Preparing"] = ["Ready"],
        ["Ready"] = ["Collected"],
    };

    [HttpPost]
    public async Task<IActionResult> PlaceOrder([FromBody] PlaceOrderRequest req)
    {
        if (req.Items is null || req.Items.Count == 0)
            return BadRequest(new { message = "Order must have at least one item" });

        var userId = User.GetUserId();
        var companyId = User.GetCompanyId();
        if (companyId is null)
            return BadRequest(new { message = "SuperAdmin cannot place orders directly" });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var order = new Order { Status = "Placed", TotalAmount = 0, UserId = userId, CompanyId = companyId.Value };

        foreach (var line in req.Items)
        {
            if (line.Quantity <= 0)
                return BadRequest(new { message = $"Quantity must be positive for item {line.MenuItemId}" });

            var stock = await db.DailyStocks
                .Include(s => s.MenuItem)
                .FirstOrDefaultAsync(s => s.MenuItemId == line.MenuItemId
                                         && s.Date == today
                                         && s.MenuItem.IsActive
                                         && s.MenuItem.CompanyId == companyId);

            if (stock is null)
                return BadRequest(new { message = $"Item {line.MenuItemId} is not available today" });

            var remaining = stock.QuantityAvailable - stock.QuantityOrdered;
            if (line.Quantity > remaining)
                return BadRequest(new { message = $"Only {remaining} servings left for {stock.MenuItem.Name}" });

            stock.QuantityOrdered += line.Quantity;

            order.Items.Add(new OrderItem
            {
                MenuItemId = line.MenuItemId,
                Quantity = line.Quantity,
                UnitPrice = stock.MenuItem.Price
            });

            order.TotalAmount += line.Quantity * stock.MenuItem.Price;
        }

        db.Orders.Add(order);
        await db.SaveChangesAsync();

        return Created($"/api/order/{order.Id}", ToResponse(order));
    }

    [HttpGet("my")]
    public async Task<IActionResult> MyOrders()
    {
        var userId = User.GetUserId();

        var orders = await db.Orders
            .Include(o => o.Items).ThenInclude(oi => oi.MenuItem)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return Ok(orders.Select(ToResponse));
    }

    [HttpGet("my/active")]
    public async Task<IActionResult> MyActiveOrders()
    {
        var userId = User.GetUserId();

        var orders = await db.Orders
            .Include(o => o.Items).ThenInclude(oi => oi.MenuItem)
            .Where(o => o.UserId == userId
                        && (o.Status == "Placed" || o.Status == "Preparing" || o.Status == "Ready"))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return Ok(orders.Select(ToResponse));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(int id)
    {
        var userId = User.GetUserId();
        var companyId = User.GetCompanyId();

        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(oi => oi.MenuItem)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();

        if (!User.IsSuperAdmin() && order.CompanyId != companyId)
            return Forbid();

        if (!User.IsCompanyAdmin() && order.UserId != userId)
            return Forbid();

        return Ok(ToResponse(order));
    }

    [HttpGet("active")]
    [Authorize(Roles = "CompanyAdmin,SuperAdmin")]
    public async Task<IActionResult> ActiveOrders()
    {
        var companyId = User.GetCompanyId();

        var query = db.Orders
            .Include(o => o.Items).ThenInclude(oi => oi.MenuItem)
            .Include(o => o.User)
            .Where(o => o.Status == "Placed" || o.Status == "Preparing" || o.Status == "Ready");

        if (!User.IsSuperAdmin())
            query = query.Where(o => o.CompanyId == companyId);

        var orders = await query.OrderBy(o => o.CreatedAt).ToListAsync();

        return Ok(orders.Select(o => new
        {
            o.Id,
            o.Status,
            o.TotalAmount,
            o.CreatedAt,
            o.UpdatedAt,
            CustomerName = o.User.Name,
            Items = o.Items.Select(oi => new OrderItemResponse(
                oi.Id, oi.MenuItemId, oi.MenuItem.Name, oi.MenuItem.Category,
                oi.Quantity, oi.UnitPrice, oi.Quantity * oi.UnitPrice))
        }));
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "CompanyAdmin,SuperAdmin")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest req)
    {
        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(oi => oi.MenuItem)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();

        if (!User.IsSuperAdmin() && order.CompanyId != User.GetCompanyId())
            return Forbid();

        if (!AllowedTransitions.TryGetValue(order.Status, out var allowed) || !allowed.Contains(req.Status))
            return BadRequest(new { message = $"Cannot transition from {order.Status} to {req.Status}" });

        order.Status = req.Status;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(ToResponse(order));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        var userId = User.GetUserId();

        var order = await db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();
        if (order.UserId != userId) return Forbid();
        if (order.Status != "Placed")
            return BadRequest(new { message = "Only placed orders can be cancelled" });

        order.Status = "Cancelled";
        order.UpdatedAt = DateTime.UtcNow;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        foreach (var item in order.Items)
        {
            var stock = await db.DailyStocks
                .FirstOrDefaultAsync(s => s.MenuItemId == item.MenuItemId && s.Date == today);
            if (stock is not null)
                stock.QuantityOrdered -= item.Quantity;
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static OrderResponse ToResponse(Order o) => new(
        o.Id, o.Status, o.TotalAmount, o.CreatedAt, o.UpdatedAt,
        o.Items.Select(oi => new OrderItemResponse(
            oi.Id, oi.MenuItemId, oi.MenuItem.Name, oi.MenuItem.Category,
            oi.Quantity, oi.UnitPrice, oi.Quantity * oi.UnitPrice)).ToList());
}
