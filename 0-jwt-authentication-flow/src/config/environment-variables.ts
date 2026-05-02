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

    @IsString()
    JWT_SECRET!: string

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(65535)
    PORT!: number
}
