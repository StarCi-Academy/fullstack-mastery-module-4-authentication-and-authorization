/**
 * Custom decorator — public.decorator.
 * (EN: Custom decorator marking a route as publicly accessible.)
 */
import {
    SetMetadata,
} from "@nestjs/common"

/** Metadata key để JwtAuthGuard đọc qua Reflector (EN: metadata key for the public bypass.) */
export const IS_PUBLIC_KEY = "isPublic"

/**
 * Đánh dấu route bỏ qua kiểm tra JWT — dùng cho /health, /docs, OAuth callback v.v.
 * (EN: Mark a route as public so the JWT guard skips authentication.)
 *
 * @returns Decorator gắn metadata `isPublic = true` (EN: decorator setting isPublic metadata).
 */
export const Public = (): MethodDecorator & ClassDecorator =>
    SetMetadata(IS_PUBLIC_KEY,
        true)
