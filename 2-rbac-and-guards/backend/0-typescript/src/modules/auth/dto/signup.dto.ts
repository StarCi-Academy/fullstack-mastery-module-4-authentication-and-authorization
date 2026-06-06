/**
 * DTO validates sign-up payload.
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

/**
 * Validated shape of the POST /auth/signup request body.
 * ValidationPipe uses class-validator decorators to reject malformed payloads.
 */
export class SignUpDto {
    /** User's email address — must be a valid email format (RFC 5322). */
    @IsEmail()
        email: string

    /** Plain-text password provided by the user; minimum 6 chars to prevent trivial passwords. */
    @IsString()
    @MinLength(6)
        password: string

    /**
     * Optional RBAC role to assign — if omitted the service defaults to Role.USER.
     * Only include when seeding privileged accounts (admin/editor) during development.
     */
    @IsOptional()
    @IsEnum(Role)
        role?: Role
}
