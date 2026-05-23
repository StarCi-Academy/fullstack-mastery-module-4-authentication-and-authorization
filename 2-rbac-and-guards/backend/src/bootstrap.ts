/**
 * Khởi tạo Nest app — ValidationPipe toàn cục, lắng nghe cổng từ ConfigService.
 * (EN: Bootstrap Nest app — global ValidationPipe, listen on port resolved via ConfigService.)
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

export async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidUnknownValues: false,
    }))
    // Lấy cổng qua ConfigService (không truy cập process.env trực tiếp).
    // (EN: Resolve port via ConfigService, not process.env.)
    const config = app.get(ConfigService)
    const port = config.get<number>("app.port") ?? 3000
    await app.listen(port, "0.0.0.0")
}
