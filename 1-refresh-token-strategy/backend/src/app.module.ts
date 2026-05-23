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
    appConfig,
    databaseConfig,
    jwtConfig,
} from "./config"
import {
    AuthModule,
    UserModule,
} from "./modules"

/** Root module — Postgres + Auth cho access/refresh JWT. (EN: Root wiring DB + auth.) */
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
                autoLoadEntities: true,
                synchronize: true,
            }),
        }),
        AuthModule,
        UserModule,
    ],
})
export class AppModule {}
