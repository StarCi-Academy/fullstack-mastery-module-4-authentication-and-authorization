/**
 * DTO validate payload dang ky.
 * (EN: DTO validates sign-up payload.)
 */
import {
    IsEmail,
    IsString,
    MinLength,
} from "class-validator"

/** Body đăng ký credential user. (EN: Sign-up DTO.) */
export class SignUpDto {
    @IsEmail()
        email: string

    @IsString()
    @MinLength(6)
        password: string
}
