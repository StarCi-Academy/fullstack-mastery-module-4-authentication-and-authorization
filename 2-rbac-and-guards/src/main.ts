import {
    NestFactory,
} from "@nestjs/core"
import {
    ValidationPipe,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    AppModule,
} from "./app.module"

/**
 * Bootstrap Nest cho demo RBAC sau JWT (guard chain).
 * (EN: Bootstrap Nest app for RBAC lesson.)
 *
 * @returns Promise<void>
 */
async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
    }))
    const configService = app.get(ConfigService)
    const port = configService.getOrThrow<number>("PORT")
    await app.listen(port)
}

bootstrap()
