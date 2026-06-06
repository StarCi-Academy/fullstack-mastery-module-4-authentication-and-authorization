using Microsoft.EntityFrameworkCore;

namespace JwtDemo;

/// <summary>
/// EF Core database context for the JWT demo application.
/// Exposes <see cref="Users"/> and <see cref="UserCredentials"/> tables
/// and configures the one-to-one relationship + unique email index via Fluent API.
/// </summary>
public class AppDbContext : DbContext
{
    /// <summary>
    /// Constructs the context with the given EF Core options (injected by DI).
    /// </summary>
    /// <param name="options">Database provider and connection settings from DI container.</param>
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    /// <summary>Provides access to the <c>users</c> table.</summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>Provides access to the <c>user_credentials</c> table.</summary>
    public DbSet<UserCredential> UserCredentials => Set<UserCredential>();

    /// <summary>
    /// Configures entity relationships and database constraints via the Fluent API.
    /// Called once at startup — overriding here avoids scattering configuration across models.
    /// </summary>
    /// <param name="modelBuilder">EF Core model builder passed by the framework.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enforce unique email at the database level — prevents two accounts sharing the same address
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // One user → one credential; cascade delete removes the credential when the user is deleted
        modelBuilder.Entity<User>()
            .HasOne(u => u.Credential)
            .WithOne(c => c.User)
            .HasForeignKey<UserCredential>(c => c.UserId) // FK lives on the credential side
            .OnDelete(DeleteBehavior.Cascade);
    }
}
