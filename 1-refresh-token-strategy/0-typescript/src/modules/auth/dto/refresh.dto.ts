/**
 * DTO validates token refresh payload.
 */
import {
    IsString,
    MinLength,
} from "class-validator"

/** Refresh token transport DTO. */
export class RefreshDto {
    @IsString()
    @MinLength(10)
        refresh_token: string
}
