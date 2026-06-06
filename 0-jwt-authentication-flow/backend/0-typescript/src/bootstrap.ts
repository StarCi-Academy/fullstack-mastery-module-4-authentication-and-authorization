/**
 * Bootstrap Nest app — global ValidationPipe, listen on port resolved via ConfigService.
 * Exported so `main.ts` can invoke it after the module graph is resolved.
 */
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
 * Initialises the NestJS application and starts listening for HTTP connections.
 * - Enables global `ValidationPipe` to auto-validate all DTOs.
 * - Reads the port from `ConfigService` (namespace `app.port`) instead of `process.env`
 *   so config is centralised in `app.config.ts`.
 */
export async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)

    // Whitelist removes unknown properties; forbidUnknownValues=false avoids class-validator 8.x
    // false-positive errors when the request body has no extra properties at all
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidUnknownValues: false,
    }))

    // Read port through ConfigService instead of process.env, per coding-common §3.
    const config = app.get(ConfigService)
    const port = config.get<number>("app.port") ?? 3000

    // Bind to loopback only to avoid OS firewall prompts during local development.
    await app.listen(port, "127.0.0.1")
}
