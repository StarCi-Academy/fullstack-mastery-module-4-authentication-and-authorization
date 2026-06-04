/**
 * Bootstrap Nest app — global ValidationPipe, listen on port resolved via ConfigService.
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

export async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidUnknownValues: false,
    }))
    // Read port through ConfigService instead of process.env, per coding-common §3.
    const config = app.get(ConfigService)
    const port = config.get<number>("app.port") ?? 3000
    await app.listen(port, "0.0.0.0")
}
