using Microsoft.EntityFrameworkCore;
using CanteenApi.Models;

namespace CanteenApi.Data;

public class CanteenDbContext(DbContextOptions<CanteenDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<DailyStock> DailyStocks => Set<DailyStock>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

        modelBuilder.Entity<MenuItem>()
            .Property(m => m.Price).HasPrecision(8, 2);

        modelBuilder.Entity<DailyStock>()
            .HasIndex(s => new { s.MenuItemId, s.Date }).IsUnique();
    }
}
