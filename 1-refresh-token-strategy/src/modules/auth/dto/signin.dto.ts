/**
 * DTO validate payload dang nhap.
 * (EN: DTO validates sign-in payload.)
 */
import {
    IsEmail,
    IsString,
} from "class-validator"

/** Body đăng nhập â€” sau khi OK nhận access+refresh pair. (EN: Sign-in DTO.) */
export class SignInDto {
    @IsEmail()
        email: string

    @IsString()
        password: string
}
