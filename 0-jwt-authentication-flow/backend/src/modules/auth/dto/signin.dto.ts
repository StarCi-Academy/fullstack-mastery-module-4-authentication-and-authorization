/**
 * DTO validate payload dang nhap.
 * (EN: DTO validates sign-in payload.)
 */
import {
    IsEmail,
    IsString,
} from "class-validator"

/** Body đăng nhập — password plaintext chỉ tồn tại trong transit để bcrypt.compare. (EN: Sign-in DTO.) */
export class SignInDto {
    @IsEmail()
        email: string

    @IsString()
        password: string
}
