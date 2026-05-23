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
    appConfig,
    databaseConfig,
    jwtConfig,
} from "./config"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    AuthModule,
} from "./modules"

/** Root module — Postgres + Google OAuth auth module. (EN: Root Nest module.) */
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig, databaseConfig, jwtConfig] }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: "postgres",
                host: config.get<string>("database.postgres.host"),
                port: config.get<number>("database.postgres.port"),
                username: config.get<string>("database.postgres.username"),
                password: config.get<string>("database.postgres.password"),
                database: config.get<string>("database.postgres.database"),
                autoLoadEntities: true,
                synchronize: true,
            }),
        }),
        AuthModule,
    ],
})
export class AppModule {}
