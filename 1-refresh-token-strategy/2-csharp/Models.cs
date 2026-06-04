using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RefreshDemo;

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

    [Required]
    [Column("password")]
    public string Password { get; set; } = null!;

    [Column("refreshTokenHash")]
    public string? RefreshTokenHash { get; set; }
}

public record SignUpRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

public record SignUpResponse(
    int Id,
    string Email
);

public record SignInRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

public record TokenResponse(
    [property: JsonPropertyName("access_token")] string AccessToken,
    [property: JsonPropertyName("refresh_token")] string RefreshToken
);
