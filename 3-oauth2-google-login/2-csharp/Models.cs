using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OAuth2Demo;

[Table("users")]
public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("email")]
    public string Email { get; set; } = null!;

    [Column("password")]
    public string? Password { get; set; }

    [Column("googleId")]
    public string? GoogleId { get; set; }

    [Column("firstName")]
    public string? FirstName { get; set; }

    [Column("lastName")]
    public string? LastName { get; set; }

    [Column("picture")]
    public string? Picture { get; set; }
}

public record GoogleUserResponse(
    string Message,
    [property: System.Text.Json.Serialization.JsonPropertyName("access_token")] string AccessToken,
    bool IsNewUser,
    GoogleUserInfo User
);

public record GoogleUserInfo(
    int Id,
    string Email,
    string Name,
    string? GoogleSub
);
