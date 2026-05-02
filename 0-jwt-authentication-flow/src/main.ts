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
 * Khởi động HTTP API Nest và áp dụng pipe validation toàn cục.
 * (EN: Bootstrap Nest HTTP API and register global validation.)
 *
 * @returns Promise<void> — không giá trị (EN: resolves when listening).
 */
async function bootstrap() {
    // Tạo instance ứng dụng từ AppModule (EN: create Nest app from root module)
    const app = await NestFactory.create(AppModule)
    // Strip payload thừa + reject field không khai báo DTO để giảm injection/mass-assignment (EN: tighten body parsing)
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
    }))
    const configService = app.get(ConfigService)
    const port = configService.getOrThrow<number>("PORT")
    await app.listen(port)
}

bootstrap()
