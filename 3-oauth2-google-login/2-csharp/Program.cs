using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Port
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");

// Services
builder.Services.AddControllers();

// Configure EF Core with PostgreSQL using Environment Variables
var pgHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
var pgPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
var pgUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "starci_user";
var pgPass = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "starci_password";
var pgDb = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "starci_db";

var connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPass};";
builder.Services.AddDbContext<OAuth2Demo.AppDbContext>(options =>
    options.UseNpgsql(connectionString));

var app = builder.Build();

// Ensure db exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OAuth2Demo.AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseRouting();

app.MapControllers();

app.Run();
