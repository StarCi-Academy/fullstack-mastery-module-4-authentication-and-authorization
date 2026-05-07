/**
 * AppModule — dang ky cac thanh phan cua feature App.
 * (EN: AppModule — registers components for App feature.)
 */
import {
    databaseConfig, jwtConfig, redisConfig, appConfig 
} from "./config"

/**
 * Root module: Postgres + Auth + User routes cho demo JWT.
 * (EN: Root module wiring Postgres with auth and user feature modules.)
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true, load: [appConfig,
                databaseConfig,
                jwtConfig] 
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: "postgres" as const,
                host: config.get("database.postgres.host"),
                port: config.get("database.postgres.port"),
                username: config.get("database.postgres.username"),
                password: config.get("database.postgres.password"),
                database: config.get("database.postgres.database"),
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
