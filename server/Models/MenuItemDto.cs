namespace CanteenApi.Models;

public record CreateMenuItemRequest(
    string Name,
    string? Description,
    decimal Price,
    string Category,
    string? ImageUrl);

public record UpdateMenuItemRequest(
    string? Name,
    string? Description,
    decimal? Price,
    string? Category,
    string? ImageUrl,
    bool? IsActive);

public record MenuItemResponse(
    int Id,
    string Name,
    string? Description,
    decimal Price,
    string Category,
    string? ImageUrl,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record SetStockRequest(int MenuItemId, DateOnly Date, int QuantityAvailable);

public record TodayStockResponse(
    int Id,
    int MenuItemId,
    string Name,
    string? Description,
    decimal Price,
    string Category,
    string? ImageUrl,
    int QuantityAvailable,
    int QuantityOrdered,
    int Remaining);
