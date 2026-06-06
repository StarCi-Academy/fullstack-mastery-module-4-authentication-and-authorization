using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RbacDemo;

/// <summary>
/// EF Core entity representing a row in the <c>users</c> database table.
/// The <see cref="Role"/> string is embedded in the JWT ClaimTypes.Role claim
/// so [Authorize(Roles="...")] can enforce RBAC without a database query per request.
/// </summary>
[Table("users")]
public class User
{
    /// <summary>Auto-incremented surrogate primary key — used as the JWT <c>sub</c> claim.</summary>
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    /// <summary>
    /// Unique login identifier.
    /// The UNIQUE constraint on the column is enforced at the database level;
    /// the controller also checks this before insert to return a meaningful 409.
    /// </summary>
    [Required]
    [Column("email")]
    public string Email { get; set; } = null!;

    /// <summary>
    /// BCrypt hash of the user's password — NEVER the plain-text password.
    /// Always use BCrypt.Net.BCrypt.HashPassword before assigning.
    /// </summary>
    [Required]
    [Column("password")]
    public string Password { get; set; } = null!;

    /// <summary>
    /// RBAC role stored as a plain string.
    /// Valid values: <c>"admin"</c>, <c>"editor"</c>, <c>"user"</c>, <c>"viewer"</c>.
    /// Defaults to <c>"user"</c> — admin accounts must be created explicitly.
    /// </summary>
    [Required]
    [Column("role")]
    public string Role { get; set; } = "user";
}

/// <summary>
/// Request body for POST /auth/signup.
/// Validated by ASP.NET Core model binding; Required and EmailAddress attributes
/// cause a 400 Bad Request if constraints are violated.
/// </summary>
/// <param name="Email">User's email — must be unique in the database.</param>
/// <param name="Password">Plain-text password; hashed with BCrypt before persistence.</param>
/// <param name="Role">Optional RBAC role; defaults to <c>"user"</c> when null or empty.</param>
public record SignUpRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password,
    string? Role
);

/// <summary>Confirmation payload returned by POST /auth/signup on success (HTTP 201).</summary>
/// <param name="Message">Human-readable confirmation string, e.g. <c>"Created"</c>.</param>
public record SignUpResponse(
    string Message
);

/// <summary>
/// Request body for POST /auth/signin.
/// Both fields are required; the controller returns 401 on any mismatch.
/// </summary>
/// <param name="Email">Registered email address.</param>
/// <param name="Password">Plain-text password to compare against the stored BCrypt hash.</param>
public record SignInRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

/// <summary>
/// Response payload returned by POST /auth/signin on success (HTTP 200).
/// The <c>access_token</c> JSON key matches the API contract used by all four language implementations.
/// </summary>
/// <param name="AccessToken">Signed JWT embedding <c>sub</c>, <c>ClaimTypes.Role</c>, and <c>exp</c> claims.</param>
public record SignInResponse(
    [property: JsonPropertyName("access_token")] string AccessToken
);
