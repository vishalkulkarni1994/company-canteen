namespace CanteenApi.Models;

public record PlaceOrderRequest(List<OrderLineRequest> Items);
public record OrderLineRequest(int MenuItemId, int Quantity);

public record OrderResponse(
    int Id,
    string Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<OrderItemResponse> Items);

public record OrderItemResponse(
    int Id,
    int MenuItemId,
    string Name,
    string Category,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal);

public record UpdateStatusRequest(string Status);
