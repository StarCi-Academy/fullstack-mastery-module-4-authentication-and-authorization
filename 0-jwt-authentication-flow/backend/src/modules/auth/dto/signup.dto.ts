/**
 * DTO validate payload đăng ký.
 * (EN: DTO validates sign-up payload.)
 */
import {
    IsEmail,
    IsString,
    MinLength,
} from "class-validator"

/** Body đăng ký — được ValidationPipe whitelist kiểm tra. (EN: Sign-up request DTO.) */
export class SignUpDto {
    @IsEmail()
        email: string

    @IsString()
    @MinLength(6)
        password: string
}
