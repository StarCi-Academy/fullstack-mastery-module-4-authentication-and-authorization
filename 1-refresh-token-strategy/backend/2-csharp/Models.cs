using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RefreshDemo;

/// <summary>
/// Database entity for a registered user.
/// The refresh token is never stored in plain text — only its BCrypt hash is persisted.
/// When <see cref="RefreshTokenHash"/> is null the user is considered logged out
/// and any outstanding refresh token will be rejected.
/// </summary>
[Table("users")]
public class User
{
    /// <summary>Auto-generated primary key.</summary>
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    /// <summary>Unique user email address used as the login identifier.</summary>
    [Required]
    [Column("email")]
    public string Email { get; set; } = null!;

    /// <summary>BCrypt hash of the user's password; never the plaintext.</summary>
    [Required]
    [Column("password")]
    public string Password { get; set; } = null!;

    /// <summary>
    /// BCrypt hash of the currently active refresh token.
    /// null means the user has logged out and no RT is valid.
    /// Overwritten on every successful token rotation.
    /// </summary>
    [Column("refreshTokenHash")]
    public string? RefreshTokenHash { get; set; }
}

/// <summary>
/// Request body for <c>POST /auth/signup</c>.
/// Both fields are required and the email must be a valid address format.
/// </summary>
public record SignUpRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

/// <summary>
/// Response body returned by <c>POST /auth/signup</c>.
/// Only the safe public fields (id + email) are exposed — never the password hash.
/// </summary>
public record SignUpResponse(
    int Id,
    string Email
);

/// <summary>
/// Request body for <c>POST /auth/signin</c>.
/// Validated the same as <see cref="SignUpRequest"/> to share DTO shape.
/// </summary>
public record SignInRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

/// <summary>
/// Token pair returned by <c>POST /auth/signin</c> and <c>POST /auth/refresh</c>.
/// Both tokens are JWT strings; the property names follow the lesson HTTP contract
/// (snake_case <c>access_token</c> / <c>refresh_token</c>).
/// </summary>
public record TokenResponse(
    /// <summary>Short-lived access token (15 minutes).</summary>
    [property: JsonPropertyName("access_token")] string AccessToken,
    /// <summary>Long-lived refresh token (7 days); store securely — rotate on every use.</summary>
    [property: JsonPropertyName("refresh_token")] string RefreshToken
);
