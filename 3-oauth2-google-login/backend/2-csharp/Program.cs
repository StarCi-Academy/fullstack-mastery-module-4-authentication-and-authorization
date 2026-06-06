using Microsoft.EntityFrameworkCore;

// --- Bootstrap ---
// WebApplication.CreateBuilder sets up the DI container, configuration sources
// (appsettings.json, environment variables), and logging before any service is registered.
var builder = WebApplication.CreateBuilder(args);

// Bind to loopback only so Windows Firewall does not show an "Allow access" popup.
// The port is read from the PORT env var so the e2e harness can assign a free port
// without modifying source code (e.g. ASPNETCORE_URLS=http://127.0.0.1:3002).
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");

// Register the MVC controller pipeline — picks up AuthController via assembly scanning.
builder.Services.AddControllers();

// --- Database configuration ---
// Read Postgres connection parameters from environment variables so the same binary
// can connect to different databases (dev Docker vs. CI vs. production) without recompiling.
var pgHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
var pgPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
var pgUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "starci_user";
var pgPass = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "starci_password";
var pgDb   = Environment.GetEnvironmentVariable("POSTGRES_DB")   ?? "starci_db";

// Assemble Npgsql connection string from the individual env vars.
var connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPass};";
// Register AppDbContext as a scoped service — EF Core manages one DbContext per HTTP request.
builder.Services.AddDbContext<OAuth2Demo.AppDbContext>(options =>
    options.UseNpgsql(connectionString));

var app = builder.Build();

// --- Database migration ---
// EnsureCreated creates the schema on first run if it does not exist.
// For production use EF Core migrations (dotnet ef migrations add / database update) instead.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OAuth2Demo.AppDbContext>();
    db.Database.EnsureCreated(); // idempotent — no-ops if tables already exist
}

// Enable routing middleware so attribute routes on controllers are resolved.
app.UseRouting();

// Map all [ApiController] classes to their attribute-defined routes.
app.MapControllers();

app.Run();
