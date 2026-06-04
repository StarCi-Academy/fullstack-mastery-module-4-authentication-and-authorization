using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace RbacDemo;

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

    [Required]
    [Column("role")]
    public string Role { get; set; } = "user";
}

public record SignUpRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password,
    string? Role
);

public record SignUpResponse(
    string Message
);

public record SignInRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

public record SignInResponse(
    [property: JsonPropertyName("access_token")] string AccessToken
);
