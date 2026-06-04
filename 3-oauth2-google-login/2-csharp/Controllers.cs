using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace OAuth2Demo.Controllers;

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

    [HttpGet("google")]
    public IActionResult GoogleRedirect()
    {
        var googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                            "response_type=code&" +
                            "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback&" +
                            "scope=email%20profile&" +
                            "client_id=dummy";

        return Redirect(googleAuthUrl);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? code)
    {
        if (code == "mockcode")
        {
            var googleId = "mock-google-sub-123";
            var email = "mock@demo.com";
            var firstName = "Mock";
            var lastName = "User";

            var user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
            if (user == null)
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            }

            bool isNewUser = false;
            if (user == null)
            {
                user = new User
                {
                    Email = email,
                    GoogleId = googleId,
                    FirstName = firstName,
                    LastName = lastName,
                    Password = null
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                isNewUser = true;
            }
            else
            {
                user.GoogleId = googleId;
                user.FirstName = firstName;
                user.LastName = lastName;
                await _context.SaveChangesAsync();
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
            
            var name = string.Join(" ", new[] { user.FirstName, user.LastName }.Where(s => !string.IsNullOrEmpty(s)));

            var response = new GoogleUserResponse(
                Message: "Đăng nhập Google thành công!",
                AccessToken: tokenString,
                IsNewUser: isNewUser,
                User: new GoogleUserInfo(user.Id, user.Email, name, user.GoogleId)
            );

            return Ok(response);
        }

        return Unauthorized(new { statusCode = 401, message = "Google authentication failed" });
    }
}
