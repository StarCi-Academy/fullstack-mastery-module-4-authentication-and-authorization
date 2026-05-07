import {
    registerAs 
} from "@nestjs/config"

export interface DatabaseConfig {
    postgres: {
        host: string
        port: number
        username: string
        password: string
        database: string
    }
}

export const databaseConfig = registerAs("database",
    (): DatabaseConfig => ({
        postgres: {
            host: process.env.DATABASE_HOST ?? "localhost",
            port: Number(process.env.DATABASE_PORT) || 5432,
            username: process.env.DATABASE_USER ?? "starci_user",
            password: process.env.DATABASE_PASSWORD ?? "starci_password",
            database: process.env.DATABASE_NAME ?? "starci_db",
        },
    }))
