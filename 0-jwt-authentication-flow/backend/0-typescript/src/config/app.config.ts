/**
 * Application-level configuration namespace registered with NestJS ConfigModule.
 * Centralises port and other app-wide settings read from environment variables.
 */
import {
    registerAs,
} from "@nestjs/config"

/**
 * Shape of the `app` config namespace accessible via `ConfigService.get("app.*")`.
 */
export interface AppConfig {
    /** HTTP port the NestJS server will listen on. */
    port: number
}

/**
 * Factory that registers app settings under the `"app"` namespace.
 * Falls back to port 3000 so the lesson runs without any `.env` edits.
 */
export const appConfig = registerAs("app", (): AppConfig => ({
    // Parse PORT as a number; default to 3000 for the lesson demo environment
    port: Number(process.env.PORT) || 3000,
}))
