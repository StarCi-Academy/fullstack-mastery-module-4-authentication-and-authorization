using Microsoft.EntityFrameworkCore;

namespace JwtDemo;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserCredential> UserCredentials => Set<UserCredential>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasOne(u => u.Credential)
            .WithOne(c => c.User)
            .HasForeignKey<UserCredential>(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
