namespace CanteenApi.Models;

public class Company
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<User> Users { get; set; } = [];
    public ICollection<MenuItem> MenuItems { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
}
