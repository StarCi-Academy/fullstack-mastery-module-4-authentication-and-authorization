using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Port
builder.WebHost.UseUrls("http://0.0.0.0:3000");

// Services
builder.Services.AddControllers();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=starci_db;Username=starci_user;Password=starci_password";
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
