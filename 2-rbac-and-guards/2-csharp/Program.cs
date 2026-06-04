using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Port
builder.WebHost.UseUrls("http://0.0.0.0:3000");

// Services
builder.Services.AddControllers();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=starci_db;Username=starci_user;Password=starci_password";
builder.Services.AddDbContext<RbacDemo.AppDbContext>(options =>
    options.UseNpgsql(connectionString));

var secret = builder.Configuration["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
var key = Encoding.UTF8.GetBytes(secret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = ClaimTypes.Role
    };
    options.Events = new JwtBearerEvents
    {
        OnChallenge = async context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = 401;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { statusCode = 401, message = "Unauthorized" });
        },
        OnForbidden = async context =>
        {
            context.Response.StatusCode = 403;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { statusCode = 403, message = "Forbidden resource", error = "Forbidden" });
        }
    };
});

var app = builder.Build();

// Ensure db exists and seed admin user
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<RbacDemo.AppDbContext>();
    db.Database.EnsureCreated();

    var adminEmail = "admin@starci.net";
    var adminUser = db.Users.FirstOrDefault(u => u.Email == adminEmail);
    if (adminUser == null)
    {
        db.Users.Add(new RbacDemo.User
        {
            Email = adminEmail,
            Password = BCrypt.Net.BCrypt.HashPassword("admin123"),
            Role = "admin"
        });
        db.SaveChanges();
    }
}

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
