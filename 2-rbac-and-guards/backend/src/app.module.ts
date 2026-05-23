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
    AppController,
} from "./app.controller"
import {
    appConfig,
    databaseConfig,
    jwtConfig,
} from "./config"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    AdminModule,
    AuthModule,
} from "./modules"

/** Root — Postgres + Auth + Admin resource RBAC. (EN: Root module for RBAC demo.) */
@Module({
    controllers: [AppController],
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
        AdminModule,
    ],
})
export class AppModule {}
