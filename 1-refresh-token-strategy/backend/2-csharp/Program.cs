// Refresh-token strategy demo — ASP.NET Core entry point.
// Wires together: EF Core + PostgreSQL, JWT Bearer authentication (two schemes),
// and the auth/users controllers.
// Run: cd backend/2-csharp && dotnet watch run
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Bind to loopback-only to prevent Windows Firewall from showing a popup dialog
// when a new binary (e.g. first dotnet run) tries to listen on all interfaces.
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");

// Register MVC controllers (AuthController + UsersController in Controllers.cs).
builder.Services.AddControllers();

// Build the PostgreSQL connection string from environment variables.
// Defaults match the .docker/compose.yaml dev credentials so no .env edits are needed.
var pgHost = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
var pgPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
var pgUser = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "starci_user";
var pgPass = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "starci_password";
var pgDb = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "starci_db";

var connectionString = $"Host={pgHost};Port={pgPort};Database={pgDb};Username={pgUser};Password={pgPass};";
// Register AppDbContext as a scoped service; EF Core resolves it per-request.
builder.Services.AddDbContext<RefreshDemo.AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Read the access-token signing secret (AT_SECRET).
// A separate RT secret is read directly in AuthController.Refresh() for the refresh flow.
var secret = builder.Configuration["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
var key = Encoding.UTF8.GetBytes(secret);

// Configure JWT Bearer authentication so that [Authorize] validates the AT.
// The RT is validated manually in AuthController.Refresh() using its own secret.
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // HTTPS not required for local demo
    options.SaveToken = true;             // store token in AuthenticationProperties for later access
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key), // verify AT with AT_SECRET
        ValidateIssuer = false,    // no issuer claim in this demo
        ValidateAudience = false,  // no audience claim in this demo
        ValidateLifetime = true,   // reject expired ATs
        ClockSkew = TimeSpan.Zero  // zero tolerance to match the 15 m TTL exactly
    };
    // Override the default 401 response to return JSON instead of the default HTML challenge.
    options.Events = new JwtBearerEvents
    {
        OnChallenge = async context =>
        {
            context.HandleResponse(); // suppress the default WWW-Authenticate header response
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { statusCode = 401, message = "Unauthorized" });
        }
    };
});

var app = builder.Build();

// Auto-create tables via EF Core on startup (dev convenience; use migrations in production).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<RefreshDemo.AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseRouting();

// Authentication must be added before Authorization so the JWT middleware
// populates the ClaimsPrincipal before [Authorize] checks it.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
