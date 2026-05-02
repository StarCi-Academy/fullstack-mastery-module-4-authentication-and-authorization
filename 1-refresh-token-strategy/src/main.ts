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
 * Khởi động HTTP API Nest và áp dụng pipe validation toàn cục (đồng bộ module `0-jwt-authentication-flow`).
 * (EN: Bootstrap Nest HTTP API with global validation and Config-driven port.)
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
