using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace JwtDemo.Controllers;

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
            Credential = new UserCredential
            {
                Password = passwordHash
            }
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Created("", new SignUpResponse(user.Id, user.Email));
    }

    [HttpPost("signin")]
    public async Task<IActionResult> SignIn([FromBody] SignInRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Credential)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || user.Credential == null ||
            !BCrypt.Net.BCrypt.Verify(request.Password, user.Credential.Password))
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        var secret = _config["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return Ok(new SignInResponse(tokenString));
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
