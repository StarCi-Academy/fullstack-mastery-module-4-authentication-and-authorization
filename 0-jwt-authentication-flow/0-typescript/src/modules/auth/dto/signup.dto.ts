/**
 * DTO validates sign-up payload.
 */
import {
    IsEmail,
    IsString,
    MinLength,
} from "class-validator"

/** Sign-up request DTO. */
export class SignUpDto {
    @IsEmail()
        email: string

    @IsString()
    @MinLength(6)
        password: string
}
