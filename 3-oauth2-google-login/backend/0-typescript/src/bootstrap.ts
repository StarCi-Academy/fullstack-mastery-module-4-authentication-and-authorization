/**
 * Bootstrap Nest app — applies global ValidationPipe, resolves the listen port
 * from ConfigService (not process.env directly), then starts the HTTP server.
 * Exported as a named function so `main.ts` (and integration tests) can call it
 * without the side-effect of starting the server on import.
 */
import "dotenv/config"
import {
    ValidationPipe,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    NestFactory,
} from "@nestjs/core"
import {
    AppModule,
} from "./app.module"

/**
 * Creates the Nest application, wires global middleware, and starts listening.
 *
 * @returns Promise that resolves once the server is bound to the port.
 */
export async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)

    // Strip unknown properties and transform incoming payloads to DTO classes.
    // `forbidUnknownValues: false` is intentional — DTO-less endpoints (OAuth callbacks)
    // use plain objects and would fail strict unknown-value validation.
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidUnknownValues: false,
    }))

    // Read port from config layer rather than process.env directly — keeps all env
    // parsing centralised in config/*.config.ts files.
    const config = app.get(ConfigService)
    const port = config.get<number>("app.port") ?? 3000

    // Bind to loopback only — prevents Windows Firewall prompts and limits surface area.
    await app.listen(port, "127.0.0.1")
}
