/**
 * DTO validate payload dang nhap.
 * (EN: DTO validates sign-in payload.)
 */
import {
    IsEmail,
    IsString,
} from "class-validator"

/** Sign-in credential — JWT output chứa role phục vụ RolesGuard. (EN: Sign-in DTO.) */
export class SignInDto {
    @IsEmail()
        email: string

    @IsString()
        password: string
}
