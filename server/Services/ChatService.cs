using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using CanteenApi.Data;
using CanteenApi.Models;

namespace CanteenApi.Services;

public class ChatService(ClaudeApiService claudeApi, IServiceScopeFactory scopeFactory, ILogger<ChatService> logger)
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly ClaudeAgentDefinition AgentDef = new()
    {
        Model = "claude-haiku-5-5",
        MaxTokens = 1024,
        SystemPrompt = """
            You are a friendly canteen ordering assistant. Help users browse today's menu and place orders.
            Always call get_today_menu first when the user wants to order or see what's available.
            When showing the menu, format it nicely with item names, prices (₹), and remaining stock.
            Before placing an order, confirm the items and total with the user.
            Keep responses concise and helpful.
            """,
        Tools = BuildToolDefinitions()
    };

    public async Task<string> SendMessage(string userMessage, int userId, List<ChatMessage>? history)
    {
        try
        {
            return await claudeApi.SendAsync(
                userMessage,
                AgentDef,
                dispatchTool: (toolName, input) => DispatchTool(toolName, input, userId),
                history,
                CancellationToken.None);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("API key"))
        {
            return "AI chat is not configured. Please set the Claude API key in appsettings.json.";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[ChatService] SendMessage failed");
            return "Sorry, something went wrong. Please try again.";
        }
    }

    private async Task<string> DispatchTool(string toolName, JsonElement input, int userId)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CanteenDbContext>();

        return toolName switch
        {
            "get_today_menu" => await GetTodayMenu(db),
            "place_order" => await PlaceOrder(db, input, userId),
            var unknown => throw new NotSupportedException($"Unknown tool '{unknown}'.")
        };
    }

    private static async Task<string> GetTodayMenu(CanteenDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var items = await db.DailyStocks
            .Include(s => s.MenuItem)
            .Where(s => s.Date == today && s.MenuItem.IsActive)
            .OrderBy(s => s.MenuItem.Category).ThenBy(s => s.MenuItem.Name)
            .Select(s => new
            {
                s.MenuItemId,
                s.MenuItem.Name,
                s.MenuItem.Description,
                Price = s.MenuItem.Price,
                s.MenuItem.Category,
                Remaining = s.QuantityAvailable - s.QuantityOrdered
            })
            .ToListAsync();

        if (items.Count == 0)
            return "No items are available today. The kitchen hasn't set today's stock yet.";

        return JsonSerializer.Serialize(items, JsonOpts);
    }

    private static async Task<string> PlaceOrder(CanteenDbContext db, JsonElement input, int userId)
    {
        var items = input.GetProperty("items").EnumerateArray().ToList();
        if (items.Count == 0)
            return JsonSerializer.Serialize(new { error = "No items specified." });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var order = new Order { Status = "Placed", TotalAmount = 0, UserId = userId };

        foreach (var line in items)
        {
            var menuItemId = line.GetProperty("menuItemId").GetInt32();
            var quantity = line.GetProperty("quantity").GetInt32();

            if (quantity <= 0)
                return JsonSerializer.Serialize(new { error = $"Quantity must be positive for item {menuItemId}." });

            var stock = await db.DailyStocks
                .Include(s => s.MenuItem)
                .FirstOrDefaultAsync(s => s.MenuItemId == menuItemId
                                         && s.Date == today
                                         && s.MenuItem.IsActive);

            if (stock is null)
                return JsonSerializer.Serialize(new { error = $"Item {menuItemId} is not available today." });

            var remaining = stock.QuantityAvailable - stock.QuantityOrdered;
            if (quantity > remaining)
                return JsonSerializer.Serialize(new { error = $"Only {remaining} servings left for {stock.MenuItem.Name}." });

            stock.QuantityOrdered += quantity;

            order.Items.Add(new OrderItem
            {
                MenuItemId = menuItemId,
                Quantity = quantity,
                UnitPrice = stock.MenuItem.Price
            });

            order.TotalAmount += quantity * stock.MenuItem.Price;
        }

        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var orderItems = order.Items.Select(oi => $"{oi.Quantity}x {oi.MenuItem.Name}").ToList();
        return $"Order #{order.Id} placed successfully! Items: {string.Join(", ", orderItems)}. Total: ₹{order.TotalAmount}";
    }

    private static object[] BuildToolDefinitions()
    {
        return
        [
            new
            {
                name = "get_today_menu",
                description = "Get today's available menu items with prices, categories, and remaining stock. Call this when the user asks what's available, wants to see the menu, or before placing an order.",
                input_schema = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            },
            new
            {
                name = "place_order",
                description = "Place an order for the user. Each item needs a menuItemId and quantity. Only call this after confirming the order details with the user.",
                input_schema = new
                {
                    type = "object",
                    properties = new
                    {
                        items = new
                        {
                            type = "array",
                            description = "List of items to order",
                            items = new
                            {
                                type = "object",
                                properties = new
                                {
                                    menuItemId = new { type = "integer", description = "The menu item ID" },
                                    quantity = new { type = "integer", description = "How many to order" }
                                },
                                required = new[] { "menuItemId", "quantity" }
                            }
                        }
                    },
                    required = new[] { "items" }
                }
            }
        ];
    }
}

public class ChatMessage
{
    public required string Role { get; set; }
    public required string Content { get; set; }
}

public record ChatRequest(string Message, List<ChatMessage>? History);
public record ChatResponse(string Reply);
