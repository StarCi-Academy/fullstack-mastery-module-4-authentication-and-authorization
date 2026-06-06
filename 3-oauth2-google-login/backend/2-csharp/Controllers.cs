using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace OAuth2Demo.Controllers;

/// <summary>
/// REST controller for the OAuth2 Google login flow.
/// Exposes two endpoints that implement the authorization-code dance:
/// <list type="number">
///   <item><description><c>GET /auth/google</c> — redirects the browser to Google's consent screen.</description></item>
///   <item><description><c>GET /auth/google/callback</c> — receives the code, upserts the local user,
///       signs an internal JWT, and returns the token as JSON.</description></item>
/// </list>
/// A mock branch is active when <paramref name="code"/> equals <c>"mockcode"</c> so the full flow
/// can be exercised offline without a real Google OAuth application.
/// </summary>
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    /// <summary>EF Core context used to read and persist user rows.</summary>
    private readonly AppDbContext _context;

    /// <summary>ASP.NET Core configuration — used to read the JWT signing secret.</summary>
    private readonly IConfiguration _config;

    /// <summary>
    /// Constructs the controller with dependencies injected by ASP.NET Core's DI container.
    /// </summary>
    /// <param name="context">EF Core database context scoped to this request.</param>
    /// <param name="config">Application configuration (appsettings.json + env vars).</param>
    public AuthController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    /// <summary>
    /// Initiates the OAuth2 authorization-code flow by redirecting the browser to Google.
    /// The redirect URL includes <c>client_id</c>, <c>scope</c>, and <c>redirect_uri</c>.
    /// In real deployments <c>client_id</c> must match the one registered in Google Cloud Console.
    /// Here it is <c>"dummy"</c> because offline testing uses the mock callback branch.
    /// </summary>
    /// <returns>HTTP 302 redirect to Google's authorization endpoint.</returns>
    [HttpGet("google")]
    public IActionResult GoogleRedirect()
    {
        // Build the authorization URL with minimal scopes (email + profile).
        // A state parameter should be added in production to prevent CSRF on the callback.
        var googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                            "response_type=code&" +
                            // redirect_uri must exactly match the Authorized Redirect URI in Google Cloud Console.
                            "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback&" +
                            // Minimal scopes — least-privilege principle; we don't need offline access.
                            "scope=email%20profile&" +
                            // Placeholder client_id — replace with real value for live Google integration.
                            "client_id=dummy";

        // Redirect(url) sets 302 status + Location header — browser follows automatically.
        return Redirect(googleAuthUrl);
    }

    /// <summary>
    /// Receives the OAuth authorization code from Google (or a mock code for offline testing),
    /// upserts the local user row, signs an internal JWT, and returns the token as JSON.
    ///
    /// <para>Two branches:</para>
    /// <list type="bullet">
    ///   <item><description><b>Mock</b> (<c>code == "mockcode"</c>): uses a fixed profile so tests/demos
    ///       can run without a real Google app configured.</description></item>
    ///   <item><description><b>Real</b>: returns 401 — full Google token exchange is not implemented in
    ///       this demo; use ASP.NET Core's <c>AddGoogle()</c> middleware for production.</description></item>
    /// </list>
    /// </summary>
    /// <param name="code">Authorization code from Google, or <c>"mockcode"</c> for mock tests.</param>
    /// <returns>
    /// HTTP 200 with <c>access_token</c>, <c>isNewUser</c>, and user summary on success;
    /// HTTP 401 when the code is not the mock value.
    /// </returns>
    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? code)
    {
        // Mock branch: bypass real Google token exchange for offline testing.
        if (code == "mockcode")
        {
            // Fixed identity values — deterministic across test runs.
            var googleId  = "mock-google-sub-123";
            var email     = "mock@demo.com";
            var firstName = "Mock";
            var lastName  = "User";

            // Stage 1: look up by googleId (stable identifier for returning users).
            var user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
            if (user == null)
            {
                // Stage 2: fall back to email so a pre-existing local account can gain Google login.
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            }

            bool isNewUser = false; // default: assume returning user
            if (user == null)
            {
                // First time we see this identity — INSERT a new OAuth-only user row.
                // password is null because the credential lives at Google, not here.
                user = new User
                {
                    Email     = email,
                    GoogleId  = googleId,
                    FirstName = firstName,
                    LastName  = lastName,
                    Password  = null // OAuth-only account: no local password
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                isNewUser = true; // signal to the client that this is a first login
            }
            else
            {
                // Returning user — re-link googleId and refresh display name fields.
                user.GoogleId  = googleId; // always overwrite to guarantee the link is set
                user.FirstName = firstName;
                user.LastName  = lastName;
                await _context.SaveChangesAsync();
                // isNewUser stays false
            }

            // --- JWT issuance ---
            // Read the signing secret from config; fall back to a hard-coded dev secret.
            // In production, always inject via environment variable — never commit real secrets.
            var secret = _config["Jwt:Secret"] ?? "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d";
            var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Minimal payload: only sub (user id) — all other data fetched from DB per request.
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
            };

            // Build a token that expires in one hour — short enough to limit leaked-token damage.
            var token = new JwtSecurityToken(
                claims:            claims,
                expires:           DateTime.UtcNow.AddHours(1),
                signingCredentials: creds
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            // Build the display name by joining non-null, non-empty first/last name parts.
            var name = string.Join(" ", new[] { user.FirstName, user.LastName }.Where(s => !string.IsNullOrEmpty(s)));

            // Assemble the response matching the API contract shared across all four lang backends.
            var response = new GoogleUserResponse(
                Message:     "Đăng nhập Google thành công!",
                AccessToken: tokenString,
                IsNewUser:   isNewUser,
                User:        new GoogleUserInfo(user.Id, user.Email, name, user.GoogleId)
            );

            return Ok(response);
        }

        // Real-code path: not implemented in this demo — reject to avoid silent misuse.
        return Unauthorized(new { statusCode = 401, message = "Google authentication failed" });
    }
}
