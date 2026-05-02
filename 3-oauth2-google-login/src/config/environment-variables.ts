import {
    Type,
} from "class-transformer"
import {
    IsEmail,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    MinLength,
} from "class-validator"

/**
 * Biến môi trường đã validate — OAuth optional để bootstrap không Google cred vẫn chạy seed/local JWT demo.
 * (EN: Validated env; Google IDs optional until OAuth is configured.)
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

    @IsString()
    JWT_SECRET!: string

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(65535)
    PORT!: number

    @IsOptional()
    @IsString()
    @MinLength(1)
    GOOGLE_CLIENT_ID?: string

    @IsOptional()
    @IsString()
    @MinLength(1)
    GOOGLE_CLIENT_SECRET?: string

    /** Registered redirect URI trong Google Cloud Console. (EN: OAuth redirect URL.) */
    @IsString()
    @MinLength(1)
    GOOGLE_CALLBACK_URL!: string

    @IsEmail()
    SEED_ADMIN_EMAIL!: string

    @IsString()
    @MinLength(6)
    SEED_ADMIN_PASSWORD!: string
}
