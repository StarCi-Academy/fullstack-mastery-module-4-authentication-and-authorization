using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RefreshDemo.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpPost("signup")]
    public async Task<IActionResult> SignUp([FromBody] SignUpRequest request)
    {
        var exists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
        {
            return Conflict(new { message = "Email already registered" });
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new User
        {
            Email = request.Email,
            Password = passwordHash
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Created("", new SignUpResponse(user.Id, user.Email));
    }

    [HttpPost("signin")]
    public async Task<IActionResult> SignIn([FromBody] SignInRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        var tokens = GenerateTokens(user.Id.ToString());
        user.RefreshTokenHash = BCrypt.Net.BCrypt.HashPassword(tokens.RefreshToken);
        await _context.SaveChangesAsync();

        return Ok(tokens);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        string? authHeader = Request.Headers["Authorization"];
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return Unauthorized(new { statusCode = 401, message = "Refresh token revoked or rotated", error = "Unauthorized" });
        }

        var token = authHeader.Substring(7);
        var refreshSecret = _config["Jwt:RefreshSecret"] ?? "8b7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5e";
        var tokenHandler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(refreshSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        try
        {
            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            var subClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                           ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

            if (string.IsNullOrEmpty(subClaim) || !int.TryParse(subClaim, out var userId))
            {
                return Unauthorized(new { statusCode = 401, message = "Refresh token revoked or rotated", error = "Unauthorized" });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.RefreshTokenHash) || 
                !BCrypt.Net.BCrypt.Verify(token, user.RefreshTokenHash))
            {
                return Unauthorized(new { statusCode = 401, message = "Refresh token revoked or rotated", error = "Unauthorized" });
            }

            var newTokens = GenerateTokens(user.Id.ToString());
            user.RefreshTokenHash = BCrypt.Net.BCrypt.HashPassword(newTokens.RefreshToken);
            await _context.SaveChangesAsync();

            return Ok(newTokens);
        }
        catch
        {
            return Unauthorized(new { statusCode = 401, message = "Refresh token revoked or rotated", error = "Unauthorized" });
        }
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(subClaim) || !int.TryParse(subClaim, out var userId))
        {
            return Unauthorized(new { message = "Unauthorized" });
        }

        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.RefreshTokenHash = null;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Logged out" });
    }

    private TokenResponse GenerateTokens(string userId)
    {
        var secret = _config["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
        var refreshSecret = _config["Jwt:RefreshSecret"] ?? "8b7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5e";

        var accessKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var refreshKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(refreshSecret));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(ClaimTypes.NameIdentifier, userId)
        };

        var tokenHandler = new JwtSecurityTokenHandler();

        var accessTok = tokenHandler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(15),
            SigningCredentials = new SigningCredentials(accessKey, SecurityAlgorithms.HmacSha256)
        });

        var refreshTok = tokenHandler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(refreshKey, SecurityAlgorithms.HmacSha256)
        });

        return new TokenResponse(tokenHandler.WriteToken(accessTok), tokenHandler.WriteToken(refreshTok));
    }
}

[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    [Authorize]
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
        var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                       ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(subClaim) || !int.TryParse(subClaim, out var userId))
        {
            return Unauthorized(new { message = "Unauthorized" });
        }

        return Ok(new
        {
            message = "Bạn đã truy cập vào khu vực bảo mật!",
            user = new { userId }
        });
    }
}
