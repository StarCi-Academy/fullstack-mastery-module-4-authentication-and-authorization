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
    AdminModule,
} from "./modules/admin/admin.module"
import {
    AuthModule,
} from "./modules/auth/auth.module"
import {
    User,
} from "./modules/user/user.entity"

/** Root â€” Postgres + Auth + Admin resource RBAC. (EN: Root module for RBAC demo.) */
@Module({
    controllers: [AppController],
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
                synchronize: true,
            }),
        }),
        AuthModule,
        AdminModule,
    ],
})
export class AppModule {}
