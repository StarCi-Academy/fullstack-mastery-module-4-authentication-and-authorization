/**
 * Khởi tạo Nest app — ValidationPipe toàn cục + ConfigService port, lắng nghe cổng.
 * (EN: Bootstrap Nest app — global ValidationPipe + ConfigService port, listen on port.)
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
        forbidNonWhitelisted: true,
    }))
    const configService = app.get(ConfigService)
    const port = configService.getOrThrow<number>("PORT")
    await app.listen(port,
        "0.0.0.0")
}
