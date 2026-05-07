/**
 * DTO validate payload đăng ký.
 * (EN: DTO validates sign-up payload.)
 */
import {
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    MinLength,
} from "class-validator"
import {
    Role,
} from "../../../common/role.enum"

/** Signup có optional role để demo tạo admin — không copy pattern nÃ y sang production verbatim. (EN: Sign-up DTO with optional role.) */
export class SignUpDto {
    @IsEmail()
        email: string

    @IsString()
    @MinLength(6)
        password: string

    @IsOptional()
    @IsEnum(Role)
        role?: Role
}
