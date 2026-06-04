using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace JwtDemo;

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

    public UserCredential? Credential { get; set; }
}

[Table("user_credentials")]
public class UserCredential
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Column("userId")]
    public int UserId { get; set; }

    [ForeignKey("UserId")]
    public User User { get; set; } = null!;

    [Required]
    [Column("password")]
    public string Password { get; set; } = null!;
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

public record SignInResponse(
    [property: JsonPropertyName("access_token")] string AccessToken
);
