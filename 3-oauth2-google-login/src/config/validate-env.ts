import {
    plainToInstance,
} from "class-transformer"
import {
    validateSync,
} from "class-validator"
import {
    EnvironmentVariables,
} from "./environment-variables"

const defaults: Record<string, string> = {
    DATABASE_HOST: "localhost",
    DATABASE_PORT: "5432",
    DATABASE_USER: "starci_user",
    DATABASE_PASSWORD: "starci_password",
    DATABASE_NAME: "starci_db",
    JWT_SECRET: "change-me",
    PORT: "3000",
    GOOGLE_CALLBACK_URL: "http://localhost:3000/auth/google/callback",
    SEED_ADMIN_EMAIL: "admin@test.com",
    SEED_ADMIN_PASSWORD: "123456",
}

/**
 * Gộp `.env` / process.env với default demo, validate class-validator rồi trả object cho ConfigModule.
 * (EN: Merge env with lesson defaults and validate.)
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
    const merged: Record<string, unknown> = {
        ...defaults,
    }
    for (const [key, value] of Object.entries(config)) {
        if (value !== undefined && value !== "") {
            merged[key] = value
        }
    }
    const validated = plainToInstance(EnvironmentVariables, merged, {
        enableImplicitConversion: true,
    })
    const errors = validateSync(validated, {
        skipMissingProperties: false,
    })
    if (errors.length > 0) {
        const messages = errors
            .map((e) => Object.values(e.constraints ?? {}).join(", "))
            .join("; ")
        throw new Error(`Env validation failed: ${messages}`)
    }
    return validated
}
