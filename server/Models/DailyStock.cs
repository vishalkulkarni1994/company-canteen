namespace CanteenApi.Models;

public class DailyStock
{
    public int Id { get; set; }
    public int MenuItemId { get; set; }
    public MenuItem MenuItem { get; set; } = null!;
    public required DateOnly Date { get; set; }
    public required int QuantityAvailable { get; set; }
    public int QuantityOrdered { get; set; }
}
