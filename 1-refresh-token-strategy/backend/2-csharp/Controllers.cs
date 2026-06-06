using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RefreshDemo.Controllers;

/// <summary>
/// Exposes the four auth endpoints for the refresh-token strategy lesson.
/// All business logic (hashing, token issuance, DB writes) lives in this controller
/// to keep the demo self-contained and easy to follow.
///
/// Endpoints:
///   POST /auth/signup   — register; returns { id, email }
///   POST /auth/signin   — authenticate; returns { access_token, refresh_token }
///   POST /auth/refresh  — rotate tokens (RT in Authorization header)
///   POST /auth/logout   — revoke RT (AT in Authorization header via [Authorize])
/// </summary>
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    /// <summary>EF Core context for user CRUD operations.</summary>
    private readonly AppDbContext _context;

    /// <summary>IConfiguration for reading JWT secrets from appsettings.json / env.</summary>
    private readonly IConfiguration _config;

    /// <summary>
    /// Initialises the controller with its dependencies via constructor injection.
    /// </summary>
    /// <param name="context">EF Core database context.</param>
    /// <param name="config">App configuration (JWT secrets etc.).</param>
    public AuthController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    /// <summary>
    /// Registers a new user with a BCrypt-hashed password.
    /// Returns HTTP 201 with { id, email } on success.
    /// Returns HTTP 409 if the email is already registered.
    /// </summary>
    /// <param name="request">Signup payload (email + plaintext password).</param>
    [HttpPost("signup")]
    public async Task<IActionResult> SignUp([FromBody] SignUpRequest request)
    {
        // Reject duplicate emails before hashing to fail fast and cheaply.
        var exists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
        {
            return Conflict(new { message = "Email already registered" });
        }

        // Hash the password with BCrypt (cost 11 default) before persisting.
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new User
        {
            Email = request.Email,
            Password = passwordHash
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Return only safe public fields — never expose the password hash.
        return Created("", new SignUpResponse(user.Id, user.Email));
    }

    /// <summary>
    /// Authenticates the user and issues a new AT + RT pair.
    /// Stores a BCrypt hash of the fresh RT in the DB immediately after issuance.
    /// Returns HTTP 200 with { access_token, refresh_token }.
    /// Returns HTTP 401 when credentials are invalid (unified message to prevent email enumeration).
    /// </summary>
    /// <param name="request">Signin payload (email + plaintext password).</param>
    [HttpPost("signin")]
    public async Task<IActionResult> SignIn([FromBody] SignInRequest request)
    {
        // Look up user; treat missing-user and wrong-password identically to prevent enumeration.
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        // Issue AT (15 m) and RT (7 d) using separate signing secrets.
        var tokens = GenerateTokens(user.Id.ToString());
        // Store only the BCrypt hash of the RT — a DB breach cannot replay the raw RT.
        user.RefreshTokenHash = BCrypt.Net.BCrypt.HashPassword(tokens.RefreshToken);
        await _context.SaveChangesAsync();

        return Ok(tokens);
    }

    /// <summary>
    /// Rotates the token pair given a valid refresh token in the Authorization header.
    /// Two-step verification: (1) JWT signature/expiry validation, then (2) BCrypt hash comparison.
    /// Returns HTTP 200 with a new { access_token, refresh_token } pair on success.
    /// Returns HTTP 401 when the token is expired, revoked, or the hash mismatches.
    /// </summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        // Extract the raw RT string from the Authorization: Bearer header.
        string? authHeader = Request.Headers["Authorization"];
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return Unauthorized(new { statusCode = 401, message = "Refresh token revoked or rotated", error = "Unauthorized" });
        }

        var token = authHeader.Substring(7); // strip "Bearer " prefix
        // Use the RT-specific secret to validate — prevents AT being used as RT.
        var refreshSecret = _config["Jwt:RefreshSecret"] ?? "8b7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5e";
        var tokenHandler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(refreshSecret)),
            ValidateIssuer = false,       // no issuer claim in this demo
            ValidateAudience = false,     // no audience claim in this demo
            ValidateLifetime = true,      // expired RTs must be rejected
            ClockSkew = TimeSpan.Zero     // zero tolerance for clock drift to match lesson contract
        };

        try
        {
            // Step 1: Validate JWT signature and expiry.
            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            // Extract the user id from the sub claim (stored as NameIdentifier or standard sub).
            var subClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

            if (string.IsNullOrEmpty(subClaim) || !int.TryParse(subClaim, out var userId))
            {
                return Unauthorized(new { statusCode = 401, message = "Refresh token revoked or rotated", error = "Unauthorized" });
            }

            // Step 2: Load user and verify the stored BCrypt hash matches the incoming RT.
            var user = await _context.Users.FindAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.RefreshTokenHash) ||
                !BCrypt.Net.BCrypt.Verify(token, user.RefreshTokenHash))
            {
                // null hash = logged out; hash mismatch = rotated/replayed token.
                return Unauthorized(new { statusCode = 401, message = "Refresh token revoked or rotated", error = "Unauthorized" });
            }

            // Rotation: issue a fresh pair and immediately overwrite the old RT hash.
            var newTokens = GenerateTokens(user.Id.ToString());
            // Old hash is replaced → old RT is now permanently invalid.
            user.RefreshTokenHash = BCrypt.Net.BCrypt.HashPassword(newTokens.RefreshToken);
            await _context.SaveChangesAsync();

            return Ok(newTokens);
        }
        catch
        {
            // jwt.Parse threw (expired, invalid signature, etc.) — treat as revoked.
            return Unauthorized(new { statusCode = 401, message = "Refresh token revoked or rotated", error = "Unauthorized" });
        }
    }

    /// <summary>
    /// Revokes the active refresh token by setting its BCrypt hash to null in the DB.
    /// Requires a valid access token in the Authorization header ([Authorize] attribute).
    /// Returns HTTP 200 with { message: "Logged out" }.
    /// Returns HTTP 401 when the AT is missing or invalid.
    /// </summary>
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        // The AT was already validated by the JwtBearer middleware; extract the user id from claims.
        var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(subClaim) || !int.TryParse(subClaim, out var userId))
        {
            return Unauthorized(new { message = "Unauthorized" });
        }

        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            // Set hash to null — any outstanding RT for this user will be rejected on next refresh.
            user.RefreshTokenHash = null;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Logged out" });
    }

    /// <summary>
    /// Signs a new AT (15 min) and RT (7 days) using their respective HMAC-SHA256 secrets.
    /// Both tokens contain only the user id as the <c>sub</c> claim.
    /// </summary>
    /// <param name="userId">String representation of the user id, used as the JWT subject.</param>
    /// <returns>A <see cref="TokenResponse"/> containing both token strings.</returns>
    private TokenResponse GenerateTokens(string userId)
    {
        // Read secrets from config (appsettings.json / env); fall back to hard-coded demo values.
        var secret = _config["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
        var refreshSecret = _config["Jwt:RefreshSecret"] ?? "8b7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5e";

        var accessKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var refreshKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(refreshSecret));

        // Both tokens carry the same minimal claim set (sub = userId).
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(ClaimTypes.NameIdentifier, userId) // NameIdentifier for [Authorize] compatibility
        };

        var tokenHandler = new JwtSecurityTokenHandler();

        // AT: short-lived (15 minutes), signed with the AT secret.
        var accessTok = tokenHandler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(15),
            SigningCredentials = new SigningCredentials(accessKey, SecurityAlgorithms.HmacSha256)
        });

        // RT: long-lived (7 days), signed with the separate RT secret.
        var refreshTok = tokenHandler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(refreshKey, SecurityAlgorithms.HmacSha256)
        });

        return new TokenResponse(tokenHandler.WriteToken(accessTok), tokenHandler.WriteToken(refreshTok));
    }
}

/// <summary>
/// Protected endpoint that returns the current user's profile.
/// Requires a valid access token in the Authorization header.
/// Used to demonstrate that the AT from signin/refresh grants access to protected resources.
/// </summary>
[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    /// <summary>
    /// Returns the authenticated user's profile.
    /// Returns HTTP 200 with { message, user: { userId } }.
    /// Returns HTTP 401 when the AT is missing or invalid.
    /// </summary>
    [Authorize]
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
        // AT already validated by JwtBearer middleware; extract user id from claims.
        var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(subClaim) || !int.TryParse(subClaim, out var userId))
        {
            return Unauthorized(new { message = "Unauthorized" });
        }

        return Ok(new
        {
            message = "You have accessed the protected area.",
            user = new { userId }
        });
    }
}
