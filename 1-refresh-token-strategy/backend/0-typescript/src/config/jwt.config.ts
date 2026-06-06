/**
 * JWT configuration factory registered under the "jwt" namespace.
 * Consumers read values via `ConfigService.get("jwt.secret")` etc.
 */
import {
    registerAs
} from "@nestjs/config"

/**
 * Shape of the JWT configuration block loaded by ConfigModule.
 */
export interface JwtConfig {
    /** HMAC secret for signing access tokens (short-lived, 15 m). */
    secret: string
    /** Expiry duration string for access tokens (e.g. "15m"). */
    expiresIn: string
    /** HMAC secret for signing refresh tokens (long-lived, 7 d). */
    refreshSecret?: string
    /** Expiry duration string for refresh tokens (e.g. "7d"). */
    refreshExpiresIn?: string
}

/**
 * Registers JWT settings under the "jwt" key so that ConfigService
 * can resolve namespaced values (e.g. `config.get("jwt.refreshSecret")`).
 * Falls back to demo secrets when env vars are absent — safe for local dev only.
 */
export const jwtConfig = registerAs("jwt",
    (): JwtConfig => ({
        // Access-token secret: short-lived bearer credential.
        secret: process.env.JWT_ACCESS_SECRET ?? "starci_access_secret",
        // Access-token TTL used by JwtModule.signAsync options.
        expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
        // Refresh-token secret: separate key prevents RT/AT signature collisions.
        refreshSecret: process.env.JWT_REFRESH_SECRET ?? "default-refresh-secret",
        // Refresh-token TTL; 7 d gives users a week of silent re-auth.
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
    }))
