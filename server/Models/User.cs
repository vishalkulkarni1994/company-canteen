namespace CanteenApi.Models;

public class User
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required string Name { get; set; }
    public string Role { get; set; } = "User";
    public int? CompanyId { get; set; }
    public Company? Company { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
