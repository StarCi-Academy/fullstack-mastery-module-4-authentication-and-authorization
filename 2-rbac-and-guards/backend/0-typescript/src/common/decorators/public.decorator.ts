/**
 * Custom decorator marking a route as publicly accessible.
 */
import {
    SetMetadata,
} from "@nestjs/common"

/** metadata key for the public bypass. */
export const IS_PUBLIC_KEY = "isPublic"

/**
 * Mark a route as public so the JWT guard skips authentication.
 *
 * @returns Decorator decorator setting isPublic metadata
 */
export const Public = (): MethodDecorator & ClassDecorator =>
    SetMetadata(IS_PUBLIC_KEY,
        true)
