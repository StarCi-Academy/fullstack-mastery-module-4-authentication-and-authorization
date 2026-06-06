/**
 * DTO validates sign-in payload.
 */
import {
    IsEmail,
    IsString,
} from "class-validator"

/**
 * Validated shape of the POST /auth/signin request body.
 * ValidationPipe rejects missing or malformed fields before the service runs.
 */
export class SignInDto {
    /** Registered email — used to locate the user record in the database. */
    @IsEmail()
        email: string

    /** Plain-text password submitted by the user; compared against the stored bcrypt hash. */
    @IsString()
        password: string
}
