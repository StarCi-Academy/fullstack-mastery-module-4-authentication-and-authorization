// ASP.NET Core minimal API entry point for the RBAC demo.
// Sets up JWT Bearer authentication, EF Core (PostgreSQL), seeds an admin user,
// and wires up attribute-based authorization ([Authorize(Roles=...)]).
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Bind to loopback only to avoid Windows Firewall popup on first run.
// Override via the PORT env var if a different port is needed.
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");

// Register MVC controllers (AuthController, AdminController).
builder.Services.AddControllers();

// Build the PostgreSQL connection string from env vars (fall back to dev defaults).
var pgHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
var pgPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
var pgUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "starci_user";
var pgPass = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "starci_password";
var pgDb   = Environment.GetEnvironmentVariable("POSTGRES_DB")      ?? "starci_db";

var connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPass};";
builder.Services.AddDbContext<RbacDemo.AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// JWT secret — read from appsettings.json or fall back to a hard-coded demo value.
// In production: store this in a secret manager (Vault, Azure Key Vault, etc.).
var secret = builder.Configuration["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
var key = Encoding.UTF8.GetBytes(secret);

// Configure JWT Bearer authentication as the default scheme.
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // demo only — enable HTTPS validation in production
    options.SaveToken = true;             // store raw token in AuthenticationProperties for later retrieval
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,                         // verify the signature matches our secret
        IssuerSigningKey         = new SymmetricSecurityKey(key),
        ValidateIssuer           = false,                        // demo — no issuer pinning
        ValidateAudience         = false,                        // demo — no audience pinning
        ValidateLifetime         = true,                         // reject expired tokens
        ClockSkew                = TimeSpan.Zero,                // no grace period for expiry
        RoleClaimType            = ClaimTypes.Role               // map ClaimTypes.Role → [Authorize(Roles="...")]
    };
    options.Events = new JwtBearerEvents
    {
        // Override the default challenge response to return JSON 401 instead of a redirect or plain text.
        OnChallenge = async context =>
        {
            context.HandleResponse(); // suppress the default challenge handling
            context.Response.StatusCode  = 401;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { statusCode = 401, message = "Unauthorized" });
        },
        // Override the default forbidden response to return JSON 403 matching the API contract.
        OnForbidden = async context =>
        {
            context.Response.StatusCode  = 403;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { statusCode = 403, message = "Forbidden resource", error = "Forbidden" });
        }
    };
});

var app = builder.Build();

// Apply EF Core migrations / ensure schema exists, then seed the admin user.
// Using a scoped service provider to safely resolve DbContext (scoped lifetime).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<RbacDemo.AppDbContext>();
    db.Database.EnsureCreated(); // creates tables if they do not exist (demo — use Migrate() in production)

    var adminEmail = "admin@starci.net";
    // Seed only if the admin account does not already exist — idempotent.
    var adminUser = db.Users.FirstOrDefault(u => u.Email == adminEmail);
    if (adminUser == null)
    {
        db.Users.Add(new RbacDemo.User
        {
            Email    = adminEmail,
            Password = BCrypt.Net.BCrypt.HashPassword("admin123"), // hash before persistence
            Role     = "admin"
        });
        db.SaveChanges();
    }
}

app.UseRouting();

app.UseAuthentication(); // must come before UseAuthorization — populates HttpContext.User from JWT
app.UseAuthorization();  // evaluates [Authorize] attributes using the identity from UseAuthentication

app.MapControllers();

app.Run();
