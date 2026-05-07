/**
 * AppModule — đăng ký các thành phần của feature App.
 * (EN: AppModule — registers components for App feature.)
 */
import {
    Module,
} from "@nestjs/common"
import {
    ConfigModule,
    ConfigService,
} from "@nestjs/config"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    AuthModule,
} from "./modules/auth/auth.module"
import {
    UserModule,
} from "./modules/user/user.module"
import {
    User,
} from "./modules/user/user.entity"
import { appConfig, databaseConfig, jwtConfig } from "./config"

/**
 * Root module: Postgres + Auth + User routes cho demo JWT.
 * (EN: Root module wiring Postgres with auth and user feature modules.)
 */
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig, databaseConfig, jwtConfig] }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: "postgres" as const,
                host: config.get<string>("database.postgres.host"),
                port: config.get<number>("database.postgres.port"),
                username: config.get<string>("database.postgres.username"),
                password: config.get<string>("database.postgres.password"),
                database: config.get<string>("database.postgres.database"),
                entities: [User],
                // synchronize chỉ cho demo local â€” production nên migration (EN: auto-sync OK for lesson DB only)
                synchronize: true,
            }),
        }),
        AuthModule,
        UserModule,
    ],
})
export class AppModule {}
