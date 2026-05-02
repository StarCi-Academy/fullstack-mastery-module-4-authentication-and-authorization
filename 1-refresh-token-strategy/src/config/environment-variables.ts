import {
    Type,
} from "class-transformer"
import {
    IsNumber,
    IsString,
    Max,
    Min,
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

    /** Secret ký/verify access JWT (TTL ngắn). (EN: Access JWT signing secret.) */
    @IsString()
    JWT_ACCESS_SECRET!: string

    /** Secret ký/verify refresh JWT (TTL dài). (EN: Refresh JWT signing secret.) */
    @IsString()
    JWT_REFRESH_SECRET!: string

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(65535)
    PORT!: number
}
