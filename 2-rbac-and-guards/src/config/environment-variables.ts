import {
    Type,
} from "class-transformer"
import {
    IsEmail,
    IsNumber,
    IsString,
    Max,
    Min,
    MinLength,
} from "class-validator"

/**
 * Biến môi trường đã validate — đồng bộ với ConfigModule sau `validate`.
 * (EN: Validated env shape consumed by Nest ConfigModule.)
 */
export class EnvironmentVariables {
    @IsString()
    DATABASE_HOST!: string

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(65535)
    DATABASE_PORT!: number

    @IsString()
    DATABASE_USER!: string

    @IsString()
    DATABASE_PASSWORD!: string

    @IsString()
    DATABASE_NAME!: string

    /** Secret ký/verify JWT cho demo RBAC. (EN: JWT signing secret.) */
    @IsString()
    JWT_SECRET!: string

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(65535)
    PORT!: number

    /** Email admin seed OnModuleInit — ghi đè trong `.env` nếu cần. (EN: Boot seed admin email.) */
    @IsEmail()
    SEED_ADMIN_EMAIL!: string

    /** Mật khẩu admin seed — tối thiểu 6 ký tự như SignUpDto. (EN: Boot seed admin password.) */
    @IsString()
    @MinLength(6)
    SEED_ADMIN_PASSWORD!: string
}
