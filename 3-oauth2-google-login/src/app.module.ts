/**
 * AppModule — dang ky cac thanh phan cua feature App.
 * (EN: AppModule — registers components for App feature.)
 */
import {
    databaseConfig, jwtConfig, redisConfig, appConfig 
} from "./config"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    AuthModule,
} from "./modules/auth/auth.module"
import {
    User,
} from "./modules/user/user.entity"

/** Root module â€” Postgres + Google OAuth auth module. (EN: Root Nest module.) */
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
                type: "postgres",
                host: config.get("database.postgres.host"),
                port: config.get("database.postgres.port"),
                username: config.get("database.postgres.username"),
                password: config.get("database.postgres.password"),
                database: config.get("database.postgres.database"),
                entities: [User],
                synchronize: true,
            }),
        }),
        AuthModule,
    ],
})
export class AppModule {}
