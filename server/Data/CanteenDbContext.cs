using Microsoft.EntityFrameworkCore;
using CanteenApi.Models;

namespace CanteenApi.Data;

public class CanteenDbContext(DbContextOptions<CanteenDbContext> options) : DbContext(options)
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<User> Users => Set<User>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<DailyStock> DailyStocks => Set<DailyStock>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Company>().HasIndex(c => c.Name).IsUnique();

        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<User>()
            .HasOne(u => u.Company)
            .WithMany(c => c.Users)
            .HasForeignKey(u => u.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MenuItem>()
            .Property(m => m.Price).HasPrecision(8, 2);
        modelBuilder.Entity<MenuItem>()
            .HasOne(m => m.Company)
            .WithMany(c => c.MenuItems)
            .HasForeignKey(m => m.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DailyStock>()
            .HasIndex(s => new { s.MenuItemId, s.Date }).IsUnique();

        modelBuilder.Entity<Order>()
            .Property(o => o.TotalAmount).HasPrecision(10, 2);
        modelBuilder.Entity<Order>()
            .HasOne(o => o.Company)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrderItem>()
            .Property(oi => oi.UnitPrice).HasPrecision(8, 2);

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Company>().HasData(
            new Company { Id = 1, Name = "TechCorp", CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Company { Id = 2, Name = "DesignStudio", CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );

        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                Email = "super@admin.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("super123"),
                Name = "Super Admin",
                Role = "SuperAdmin",
                CompanyId = null,
                CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = 2,
                Email = "admin@techcorp.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Name = "TechCorp Admin",
                Role = "CompanyAdmin",
                CompanyId = 1,
                CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = 3,
                Email = "user@techcorp.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("user123"),
                Name = "John Tech",
                Role = "User",
                CompanyId = 1,
                CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = 4,
                Email = "admin@designstudio.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Name = "Design Admin",
                Role = "CompanyAdmin",
                CompanyId = 2,
                CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = 5,
                Email = "user@designstudio.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("user123"),
                Name = "Jane Design",
                Role = "User",
                CompanyId = 2,
                CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<MenuItem>().HasData(
            new MenuItem { Id = 1, Name = "Masala Chai", Description = "Hot spiced tea", Price = 20, Category = "Beverages", CompanyId = 1, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new MenuItem { Id = 2, Name = "Samosa", Description = "Crispy potato filled pastry", Price = 15, Category = "Snacks", CompanyId = 1, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new MenuItem { Id = 3, Name = "Veg Thali", Description = "Rice, dal, sabzi, roti, salad", Price = 120, Category = "Meals", CompanyId = 1, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new MenuItem { Id = 4, Name = "Chicken Biryani", Description = "Fragrant basmati rice with chicken", Price = 150, Category = "Meals", CompanyId = 1, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new MenuItem { Id = 5, Name = "Cold Coffee", Description = "Chilled coffee with ice cream", Price = 50, Category = "Beverages", CompanyId = 1, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },

            new MenuItem { Id = 6, Name = "Green Tea", Description = "Organic green tea", Price = 30, Category = "Beverages", CompanyId = 2, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new MenuItem { Id = 7, Name = "Paneer Wrap", Description = "Grilled paneer in tortilla", Price = 80, Category = "Snacks", CompanyId = 2, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new MenuItem { Id = 8, Name = "Pasta Alfredo", Description = "Creamy white sauce pasta", Price = 110, Category = "Meals", CompanyId = 2, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new MenuItem { Id = 9, Name = "Caesar Salad", Description = "Fresh romaine with dressing", Price = 90, Category = "Salads", CompanyId = 2, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new MenuItem { Id = 10, Name = "Smoothie Bowl", Description = "Acai berry smoothie bowl", Price = 120, Category = "Beverages", CompanyId = 2, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        modelBuilder.Entity<DailyStock>().HasData(
            new DailyStock { Id = 1, MenuItemId = 1, Date = today, QuantityAvailable = 50 },
            new DailyStock { Id = 2, MenuItemId = 2, Date = today, QuantityAvailable = 30 },
            new DailyStock { Id = 3, MenuItemId = 3, Date = today, QuantityAvailable = 25 },
            new DailyStock { Id = 4, MenuItemId = 4, Date = today, QuantityAvailable = 20 },
            new DailyStock { Id = 5, MenuItemId = 5, Date = today, QuantityAvailable = 40 },
            new DailyStock { Id = 6, MenuItemId = 6, Date = today, QuantityAvailable = 30 },
            new DailyStock { Id = 7, MenuItemId = 7, Date = today, QuantityAvailable = 20 },
            new DailyStock { Id = 8, MenuItemId = 8, Date = today, QuantityAvailable = 15 },
            new DailyStock { Id = 9, MenuItemId = 9, Date = today, QuantityAvailable = 15 },
            new DailyStock { Id = 10, MenuItemId = 10, Date = today, QuantityAvailable = 20 }
        );
    }
}
