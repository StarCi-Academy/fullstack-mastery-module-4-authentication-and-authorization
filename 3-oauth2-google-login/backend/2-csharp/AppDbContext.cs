using Microsoft.EntityFrameworkCore;

namespace OAuth2Demo;

/// <summary>
/// EF Core database context for the OAuth2 demo.
///
/// <para>Exposes a single <c>DbSet&lt;User&gt;</c> and configures the unique indexes required
/// by the two-stage upsert logic in <see cref="Controllers.AuthController"/>.</para>
///
/// <para>In production, use EF Core migrations (<c>dotnet ef migrations add</c>) rather than
/// <c>EnsureCreated</c> so schema changes are tracked and reversible.</para>
/// </summary>
public class AppDbContext : DbContext
{
    /// <summary>
    /// Passes the configured options (Npgsql connection, etc.) to the base <see cref="DbContext"/>.
    /// </summary>
    /// <param name="options">Options resolved from the DI container (registered in Program.cs).</param>
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// The <c>users</c> table — maps to the <see cref="User"/> entity.
    /// Using <c>Set&lt;User&gt;</c> instead of an auto-property avoids the nullable-reference
    /// warning while keeping the DbSet non-nullable for callers.
    /// </summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>
    /// Configures entity-level constraints that cannot be expressed with data annotations alone.
    /// </summary>
    /// <param name="modelBuilder">Fluent API builder provided by EF Core.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Unique index on email — ensures two accounts cannot share the same address.
        // Enforced at the DB level (not just application level) for safety.
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Unique index on googleId — prevents two rows from being linked to the same Google account.
        // Nullable values (un-linked accounts) are allowed; only non-null duplicates are rejected.
        modelBuilder.Entity<User>()
            .HasIndex(u => u.GoogleId)
            .IsUnique();
    }
}
