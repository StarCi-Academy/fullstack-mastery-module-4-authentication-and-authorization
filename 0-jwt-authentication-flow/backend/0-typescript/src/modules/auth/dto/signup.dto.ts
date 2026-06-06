/**
 * DTO validates the sign-up request body before it reaches `AuthService.signUp()`.
 * class-validator decorators run via the global `ValidationPipe`.
 */
import {
    IsEmail,
    IsString,
    MinLength,
} from "class-validator"

/**
 * Sign-up request DTO.
 * Both fields are required — the `ValidationPipe` rejects requests missing either.
 */
export class SignUpDto {
    /** Must be a valid email address (RFC 5322 format). */
    @IsEmail()
        email: string

    /** Minimum 6 characters — enforced server-side as a baseline security policy. */
    @IsString()
    @MinLength(6)
        password: string
}
