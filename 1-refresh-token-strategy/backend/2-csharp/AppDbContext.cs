using Microsoft.EntityFrameworkCore;

namespace RefreshDemo;

/// <summary>
/// EF Core database context for the refresh-token demo.
/// Manages the <see cref="User"/> table and enforces the unique email constraint.
/// </summary>
public class AppDbContext : DbContext
{
    /// <summary>
    /// Initialises the context with the provided EF Core options (injected by DI).
    /// </summary>
    /// <param name="options">EF Core configuration including the connection string.</param>
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// DbSet that maps to the "users" table in PostgreSQL.
    /// Use this set for all CRUD operations on <see cref="User"/> records.
    /// </summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>
    /// Configures the EF Core model: adds a unique index on the email column
    /// to enforce the email-uniqueness constraint at the database level.
    /// </summary>
    /// <param name="modelBuilder">The model builder provided by EF Core.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enforce unique email at the DB level in addition to the application-level check.
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();
    }
}
