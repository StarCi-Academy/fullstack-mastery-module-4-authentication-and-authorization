/**
 * Khởi tạo Nest app — ValidationPipe toàn cục, lắng nghe cổng.
 * (EN: Bootstrap Nest app — global ValidationPipe, listen on port.)
 */
import "dotenv/config"
import {
    ValidationPipe,
} from "@nestjs/common"
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
    const port = Number(process.env.PORT) || 3000
    await app.listen(port,
        "0.0.0.0")
}