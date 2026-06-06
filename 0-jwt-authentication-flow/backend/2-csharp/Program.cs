using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// ── Composition root ──────────────────────────────────────────────────────────
// Reads configuration, registers services, wires JWT Bearer middleware,
// then starts the ASP.NET Core host on the configured port.

var builder = WebApplication.CreateBuilder(args);

// Bind to loopback only to avoid Windows Defender Firewall prompts during local development
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");

// Register MVC controllers — AuthController and UsersController are discovered automatically
builder.Services.AddControllers();

// ── Database ──────────────────────────────────────────────────────────────────
// Read PostgreSQL connection details from environment variables;
// fall back to developer defaults so the app runs without any .env edits.
var pgHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
var pgPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
var pgUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "starci_user";
var pgPass = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "starci_password";
var pgDb   = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "starci_db";

var connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPass};";

// Register EF Core with Npgsql (PostgreSQL driver)
builder.Services.AddDbContext<JwtDemo.AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// ── JWT Bearer authentication ─────────────────────────────────────────────────
// The same secret is used to sign tokens (in AuthController) and to verify them here.
// Any instance holding this secret can verify any token issued by another instance,
// which is why JWT enables stateless, horizontally-scalable auth.
var secret = builder.Configuration["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
var key = Encoding.UTF8.GetBytes(secret);

builder.Services.AddAuthentication(options =>
{
    // Set JwtBearer as the scheme used by [Authorize] attributes
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Allow plain HTTP for local demo
    options.SaveToken = true;             // Make the raw token available via HttpContext

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,                           // Verify HMAC signature
        IssuerSigningKey = new SymmetricSecurityKey(key),          // Must match signing key
        ValidateIssuer   = false,                                  // No issuer claim required for this demo
        ValidateAudience = false,                                  // No audience claim required for this demo
        ValidateLifetime = true,                                   // Reject tokens past their `exp` claim
        ClockSkew = TimeSpan.Zero                                  // No tolerance window — token expires exactly at `exp`
    };

    // Override the default 401 challenge response to return consistent JSON
    options.Events = new JwtBearerEvents
    {
        OnChallenge = async context =>
        {
            context.HandleResponse(); // Suppress the default WWW-Authenticate header response
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";
            // Return the same shape as NestJS/Go backends for cross-lang parity
            await context.Response.WriteAsJsonAsync(new { statusCode = 401, message = "Unauthorized" });
        }
    };
});

// Register authorization policies — required to evaluate [Authorize] attributes
builder.Services.AddAuthorization();

var app = builder.Build();

// ── Database migration ────────────────────────────────────────────────────────
// EnsureCreated creates the schema if it does not exist; safe for demo usage.
// Production projects should use Migrations instead.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<JwtDemo.AppDbContext>();
    db.Database.EnsureCreated();
}

// ── Middleware pipeline ────────────────────────────────────────────────────────
// Order matters: Routing → Authentication → Authorization → Controllers.
app.UseRouting();
app.UseAuthentication(); // Reads and validates the JWT from the Authorization header
app.UseAuthorization();  // Evaluates [Authorize] attributes on controller actions

app.MapControllers();

app.Run();
