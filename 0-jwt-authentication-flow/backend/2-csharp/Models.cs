using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace JwtDemo;

/// <summary>
/// Maps to the <c>users</c> table.
/// Keeps identity (email) separate from secrets (bcrypt hash) in <see cref="UserCredential"/>
/// so that a query loading users without credentials will not expose password data.
/// </summary>
[Table("users")]
public class User
{
    /// <summary>Auto-incremented primary key; used as the JWT <c>sub</c> claim.</summary>
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    /// <summary>Unique email address used as the login identifier.</summary>
    [Required]
    [Column("email")]
    public string Email { get; set; } = null!;

    /// <summary>
    /// Navigation property to the credential row.
    /// Loaded lazily — EF Core only populates this when <c>Include(u =&gt; u.Credential)</c> is used.
    /// </summary>
    public UserCredential? Credential { get; set; }
}

/// <summary>
/// Maps to the <c>user_credentials</c> table.
/// One-to-one with <see cref="User"/> — each user has exactly one credential row
/// containing the BCrypt hash of their password.
/// </summary>
[Table("user_credentials")]
public class UserCredential
{
    /// <summary>Auto-incremented primary key.</summary>
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    /// <summary>Foreign key column referencing <c>users.id</c>.</summary>
    [Column("userId")]
    public int UserId { get; set; }

    /// <summary>
    /// Back-reference to the owning <see cref="User"/>.
    /// EF Core uses this navigation to resolve the one-to-one relationship.
    /// </summary>
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;

    /// <summary>
    /// BCrypt hash of the user's password.
    /// Never store or log the plain-text password — only this hashed value is persisted.
    /// </summary>
    [Required]
    [Column("password")]
    public string Password { get; set; } = null!;
}

/// <summary>Validated sign-up request body (email + plain-text password).</summary>
public record SignUpRequest(
    /// <summary>Must be a valid email address (RFC 5322 format).</summary>
    [Required][EmailAddress] string Email,
    /// <summary>Minimum 6 characters enforced via controller validation.</summary>
    [Required] string Password
);

/// <summary>Minimal sign-up acknowledgement returned to the client (id + email, no password).</summary>
public record SignUpResponse(
    /// <summary>The newly created user's database id.</summary>
    int Id,
    /// <summary>The registered email address.</summary>
    string Email
);

/// <summary>Validated sign-in request body (email + plain-text password).</summary>
public record SignInRequest(
    /// <summary>Email address identifying the account.</summary>
    [Required][EmailAddress] string Email,
    /// <summary>Plain-text password to verify against the stored BCrypt hash.</summary>
    [Required] string Password
);

/// <summary>
/// Sign-in response carrying the signed JWT access token.
/// The JSON property name is <c>access_token</c> (snake_case) per the API contract.
/// </summary>
public record SignInResponse(
    /// <summary>Signed JWT string — format is <c>header.payload.signature</c>.</summary>
    [property: JsonPropertyName("access_token")] string AccessToken
);
