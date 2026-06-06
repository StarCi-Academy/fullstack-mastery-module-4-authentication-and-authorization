using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RbacDemo.Controllers;

/// <summary>
/// Handles user registration and authentication endpoints.
/// These routes are publicly accessible — no [Authorize] attribute on the class.
/// Signup hashes the password with BCrypt; signin validates and issues a signed JWT
/// that embeds the ClaimTypes.Role claim for downstream [Authorize(Roles=...)] checks.
/// </summary>
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    /// <summary>EF Core DbContext for reading and writing the users table.</summary>
    private readonly AppDbContext _context;

    /// <summary>App configuration — provides the JWT secret from appsettings.json or env.</summary>
    private readonly IConfiguration _config;

    /// <summary>
    /// Initializes the controller with its required dependencies via DI.
    /// </summary>
    /// <param name="context">Scoped DbContext injected by the DI container.</param>
    /// <param name="config">Application configuration for reading JWT settings.</param>
    public AuthController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    /// <summary>
    /// Registers a new user account.
    /// Returns 201 Created on success; 409 Conflict if the email is already taken.
    /// Password is hashed with BCrypt before being persisted — never stored as plain text.
    /// </summary>
    /// <param name="request">Sign-up payload containing email, password, and optional role.</param>
    /// <returns>201 with a confirmation message, or 409 on duplicate email.</returns>
    [HttpPost("signup")]
    public async Task<IActionResult> SignUp([FromBody] SignUpRequest request)
    {
        // Check for duplicate email before inserting to return a meaningful 409.
        var exists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
        {
            return Conflict(new { message = "Email already registered" });
        }

        // Hash the password with BCrypt default cost (10 rounds) — never store raw passwords.
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Default to "user" role when the caller does not provide one explicitly.
        var role = string.IsNullOrEmpty(request.Role) ? "user" : request.Role;
        var user = new User
        {
            Email = request.Email,
            Password = passwordHash,
            Role = role
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // HTTP 201 Created — include an empty location to satisfy the Created() signature.
        return Created("", new SignUpResponse("Created"));
    }

    /// <summary>
    /// Validates credentials and returns a signed JWT embedding the user's role.
    /// The JWT contains a ClaimTypes.Role claim so [Authorize(Roles="...")] works without
    /// a database round-trip on subsequent requests.
    /// Returns 200 on success; 401 Unauthorized on wrong email or password.
    /// </summary>
    /// <param name="request">Sign-in payload containing email and password.</param>
    /// <returns>200 with <c>{ "access_token": "..." }</c>, or 401 on bad credentials.</returns>
    [HttpPost("signin")]
    public async Task<IActionResult> SignIn([FromBody] SignInRequest request)
    {
        // Find user by email; use a generic 401 message to prevent email enumeration.
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
        {
            // Same error message for "user not found" and "wrong password" — avoids enumeration.
            return Unauthorized(new { message = "Invalid credentials" });
        }

        // Derive the HMAC key from the configured JWT secret.
        var secret = _config["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256); // HS256

        // Build claims: sub (standard) + ClaimTypes.Role (read by [Authorize]) + "role" (custom).
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),   // standard subject claim
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),     // ASP.NET identity subject
            new Claim(ClaimTypes.Role, user.Role),                        // read by [Authorize(Roles="...")]
            new Claim("role", user.Role)                                  // extra custom claim for readability
        };

        // Build the JWT with a 1-hour TTL — adequate for a demo scenario.
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1), // "exp" claim — token expires in 1 hour
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return Ok(new SignInResponse(tokenString));
    }
}

/// <summary>
/// Demonstrates attribute-based RBAC via [Authorize(Roles="...")] on individual endpoints.
/// ASP.NET Core reads the ClaimTypes.Role claim from the JWT (populated by JWT Bearer middleware)
/// and compares it against the Roles attribute value before the action method executes.
///
/// Route guard summary:
/// <list type="bullet">
///   <item>GET /admin/dashboard   — [Authorize(Roles = "admin")]         single-role gate</item>
///   <item>GET /editor/articles   — [Authorize(Roles = "admin,editor")]  multi-role OR gate</item>
///   <item>GET /public/health     — no attribute                         open to all</item>
/// </list>
/// </summary>
[ApiController]
public class AdminController : ControllerBase
{
    /// <summary>
    /// Admin-only dashboard — protected by [Authorize(Roles = "admin")].
    /// A valid JWT for an editor or user role receives 403 Forbidden.
    /// Returns a static mock payload; the lesson focuses on the authorization mechanism.
    /// </summary>
    /// <returns>200 with mock dashboard stats for the admin.</returns>
    [Authorize(Roles = "admin")] // only "admin" role value in ClaimTypes.Role passes
    [HttpGet("admin/dashboard")]
    public IActionResult GetAdminDashboard()
    {
        // Static mock — real implementation would query a database for live stats.
        return Ok(new
        {
            message = "Chào mừng Admin vào khu vực mật!",
            stats = new
            {
                users = 100,
                orders = 15
            }
        });
    }

    /// <summary>
    /// Editor area — protected by [Authorize(Roles = "admin,editor")] (multi-role OR).
    /// Both "admin" and "editor" role values pass the check; "user" and "viewer" receive 403.
    /// </summary>
    /// <returns>200 with a mock articles list for editors and admins.</returns>
    [Authorize(Roles = "admin,editor")] // comma-separated = OR: either role grants access
    [HttpGet("editor/articles")]
    public IActionResult GetEditorArticles()
    {
        // Static mock article list — focuses on multi-role OR authorization demo.
        return Ok(new
        {
            message = "Editor area — admin và editor đều xem được.",
            articles = new[]
            {
                new { id = 1, title = "Hello RBAC" },
                new { id = 2, title = "Multi-role OR check" }
            }
        });
    }

    /// <summary>
    /// Public liveness probe — no [Authorize] attribute means any request (token or not) succeeds.
    /// Demonstrates how to leave a route completely open within an otherwise protected controller.
    /// </summary>
    /// <returns>200 with <c>{ "status": "ok" }</c>.</returns>
    [HttpGet("public/health")] // no [Authorize] → permitAll equivalent in ASP.NET Core
    public IActionResult GetPublicHealth()
    {
        return Ok(new { status = "ok" });
    }
}
