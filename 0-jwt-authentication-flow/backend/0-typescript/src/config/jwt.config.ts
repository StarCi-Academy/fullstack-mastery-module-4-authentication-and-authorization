/**
 * JWT configuration namespace registered with NestJS ConfigModule.
 * Reads secrets and expiry settings from environment variables with safe demo defaults.
 */
import {
    registerAs,
} from "@nestjs/config"

/**
 * Shape of the `jwt` config namespace accessible via `ConfigService.get("jwt.*")`.
 */
export interface JwtConfig {
    /** Secret used to sign and verify access tokens (HMAC-SHA256). */
    secret: string
    /** Access token lifetime, e.g. "15m" or "1h". */
    expiresIn: string
    /** Secret for refresh token signing — optional, used by refresh-token-strategy lesson. */
    refreshSecret?: string
    /** Refresh token lifetime, e.g. "7d". */
    refreshExpiresIn?: string
}

/**
 * Factory that registers JWT settings under the `"jwt"` namespace.
 * All values fall back to safe demo defaults so the lesson runs without a real `.env`.
 */
export const jwtConfig = registerAs("jwt", (): JwtConfig => ({
    // Access token secret — override with a strong random value in production
    secret: process.env.JWT_ACCESS_SECRET ?? "starci_access_secret",

    // Short-lived access token; demo uses 15m to illustrate expiry without waiting too long
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",

    // Refresh token secret — separate from access token to limit blast radius if one leaks
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "default-refresh-secret",

    // Refresh token lives longer so the user doesn't have to re-login frequently
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
}))
