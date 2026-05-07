/**
 * DTO validate payload lam moi token.
 * (EN: DTO validates token refresh payload.)
 */
import {
    IsString,
    MinLength,
} from "class-validator"

/** Client gửi refresh JWT string trong JSON â€” không đặt trong header để đơn giản curl/postman. (EN: Refresh token transport DTO.) */
export class RefreshDto {
    @IsString()
    @MinLength(10)
        refresh_token: string
}
