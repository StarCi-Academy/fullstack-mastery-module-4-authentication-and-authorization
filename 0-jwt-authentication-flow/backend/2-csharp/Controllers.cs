using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace JwtDemo.Controllers;

/// <summary>
/// REST controller for authentication endpoints (<c>/auth/signup</c> and <c>/auth/signin</c>).
/// All routes are public — they issue or create credentials.
/// No session is stored; the signed JWT is the only stateful artifact returned to the client.
/// </summary>
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    /// <summary>EF Core context for user persistence.</summary>
    private readonly AppDbContext _context;

    /// <summary>Application configuration — used to read the JWT secret.</summary>
    private readonly IConfiguration _config;

    /// <summary>
    /// Constructs the controller with required dependencies via DI.
    /// </summary>
    /// <param name="context">EF Core db context (users + credentials).</param>
    /// <param name="config">Application configuration for reading jwt.secret.</param>
    public AuthController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    /// <summary>
    /// Registers a new user with a BCrypt-hashed password.
    /// Returns HTTP 201 Created with the new user id and email.
    /// </summary>
    /// <param name="request">Validated sign-up body (email + plain-text password).</param>
    /// <returns>HTTP 201 with <see cref="SignUpResponse"/> or 409 if the email already exists.</returns>
    [HttpPost("signup")]
    public async Task<IActionResult> SignUp([FromBody] SignUpRequest request)
    {
        // Guard: reject duplicate accounts to keep email unique per user
        var exists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
        {
            // Return 409 Conflict — the client can display a "try a different email" message
            return Conflict(new { message = "Email already registered" });
        }

        // Hash the password with BCrypt; one-way, so the plain-text never touches the database
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Build user + embedded credential — EF Core saves both rows in one SaveChanges call
        var user = new User
        {
            Email = request.Email,
            Credential = new UserCredential
            {
                Password = passwordHash // Only the hash is persisted
            }
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Return only safe fields — never echo the hash or plain-text password back
        return Created("", new SignUpResponse(user.Id, user.Email));
    }

    /// <summary>
    /// Validates credentials and issues a signed JWT access token on success.
    /// HTTP 200 OK — not 201, because no new resource is created on sign-in.
    /// </summary>
    /// <param name="request">Validated sign-in body (email + plain-text password).</param>
    /// <returns>HTTP 200 with <see cref="SignInResponse"/> containing the token, or 401 on failure.</returns>
    [HttpPost("signin")]
    public async Task<IActionResult> SignIn([FromBody] SignInRequest request)
    {
        // Load the user with their credential relation for BCrypt comparison
        var user = await _context.Users
            .Include(u => u.Credential)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        // Reject both "user not found" and "wrong password" with the same 401 message
        // to prevent user-enumeration attacks (attacker cannot distinguish the two cases)
        if (user == null || user.Credential == null ||
            !BCrypt.Net.BCrypt.Verify(request.Password, user.Credential.Password))
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        // Read the signing secret from configuration — must match the key used in JwtBearer setup
        var secret = _config["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Build JWT claims — only the user id is embedded; no sensitive data in the payload
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), // Standard "subject" claim
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())    // ASP.NET identity convention
        };

        // Construct the token with a 1-hour expiry; HMAC signature makes the payload tamper-proof
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );

        // Serialize the token to its compact string form (header.payload.signature)
        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return Ok(new SignInResponse(tokenString));
    }
}

/// <summary>
/// REST controller for protected user routes (<c>/users/profile</c>).
/// Routes in this controller require a valid JWT Bearer token — any request without
/// a valid token is rejected with HTTP 401 before the handler runs.
/// </summary>
[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    /// <summary>
    /// Returns the authenticated user's id extracted from the JWT <c>sub</c> claim.
    /// The id comes from the verified token — no database query is needed.
    /// </summary>
    /// <returns>HTTP 200 with the user id from the token, or 401 if the token is missing/invalid.</returns>
    [Authorize] // JwtBearer middleware verifies the token before this handler runs
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
        // ASP.NET Core resolves ClaimTypes.NameIdentifier from the verified token automatically
        // Fall back to the raw "sub" claim in case the middleware only populates that one
        var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        // Safety check — should never fail if [Authorize] is present, but guard defensively
        if (string.IsNullOrEmpty(subClaim) || !int.TryParse(subClaim, out var userId))
        {
            return Unauthorized(new { message = "Unauthorized" });
        }

        // userId is derived entirely from the verified token — no session or DB lookup required
        return Ok(new
        {
            message = "You have accessed a protected resource!",
            user = new { userId }
        });
    }
}
