using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OAuth2Demo;

/// <summary>
/// EF Core entity representing a user row in the <c>users</c> table.
///
/// <para>Supports both local password accounts and OAuth-only (Google) accounts:</para>
/// <list type="bullet">
///   <item><description>Password-only users: <c>GoogleId</c> is <c>null</c>.</description></item>
///   <item><description>OAuth-only users: <c>Password</c> is <c>null</c> — credential lives at Google.</description></item>
///   <item><description>Linked users: both fields are set after the user logs in via Google on a pre-existing account.</description></item>
/// </list>
///
/// <para><c>GoogleId</c> holds Google's stable <c>sub</c> claim and is used as the primary
/// identity-matching key; <c>Email</c> is the fallback for account linking.</para>
/// </summary>
[Table("users")]
public class User
{
    /// <summary>Auto-incremented surrogate primary key — stable internal identifier.</summary>
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    /// <summary>Unique email address — used as login hint and as the account-linking fallback key.</summary>
    [Required]
    [Column("email")]
    public string Email { get; set; } = null!;

    /// <summary>
    /// bcrypt hash of the user's local password.
    /// <c>null</c> for accounts created via Google OAuth — they have no local password.
    /// </summary>
    [Column("password")]
    public string? Password { get; set; }

    /// <summary>
    /// Google subject (<c>sub</c>) identifier — unique across all Google accounts.
    /// <c>null</c> until the user logs in with Google for the first time.
    /// A unique index (configured in <see cref="AppDbContext"/>) prevents two rows from being
    /// linked to the same Google account.
    /// </summary>
    [Column("googleId")]
    public string? GoogleId { get; set; }

    /// <summary>User's given name from the Google profile, or set manually.</summary>
    [Column("firstName")]
    public string? FirstName { get; set; }

    /// <summary>User's family name from the Google profile, or set manually.</summary>
    [Column("lastName")]
    public string? LastName { get; set; }

    /// <summary>URL to the user's profile photo returned by Google; used purely as a display hint.</summary>
    [Column("picture")]
    public string? Picture { get; set; }
}

/// <summary>
/// Immutable response record returned by the callback endpoint on successful login.
/// Using a record ensures JSON serialization is consistent and the shape cannot drift.
/// </summary>
/// <param name="Message">Human-readable login confirmation message.</param>
/// <param name="AccessToken">Signed internal JWT — clients use this in the Authorization header.</param>
/// <param name="IsNewUser"><c>true</c> when the user row was just INSERTed; <c>false</c> on upsert.</param>
/// <param name="User">Safe user summary — never includes password hash or internal db columns.</param>
public record GoogleUserResponse(
    string Message,
    // JSON key is access_token (snake_case) to match the API contract shared across all four lang backends.
    [property: System.Text.Json.Serialization.JsonPropertyName("access_token")] string AccessToken,
    bool IsNewUser,
    GoogleUserInfo User
);

/// <summary>
/// Safe subset of user data included in the login response.
/// Exposes only display-safe fields — never the password hash.
/// </summary>
/// <param name="Id">Local surrogate primary key.</param>
/// <param name="Email">User's email address.</param>
/// <param name="Name">Display name assembled from first + last name.</param>
/// <param name="GoogleSub">Google <c>sub</c> claim aliased to match Google's terminology.</param>
public record GoogleUserInfo(
    int Id,
    string Email,
    string Name,
    string? GoogleSub
);
