/**
 * DTO validates the sign-in request body before it reaches `AuthService.signIn()`.
 * class-validator decorators run via the global `ValidationPipe`.
 */
import {
    IsEmail,
    IsString,
} from "class-validator"

/**
 * Sign-in request DTO.
 * Intentionally no `MinLength` on password — validation here is only for type/format;
 * the bcrypt compare in `AuthService` handles the actual credential check.
 */
export class SignInDto {
    /** Must be a valid email format — used to look up the user record. */
    @IsEmail()
        email: string

    /** Plain-text password sent over TLS; bcrypt compares it against the stored hash. */
    @IsString()
        password: string
}
