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
            host: process.env.POSTGRES_HOST ?? "localhost",
            port: Number(process.env.POSTGRES_PORT) || 5432,
            username: process.env.POSTGRES_USER ?? "starci_user",
            password: process.env.POSTGRES_PASSWORD ?? "starci_password",
            database: process.env.POSTGRES_DB ?? "starci_db",
        },
    }))
