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
import {
    validateEnv,
} from "./config/env.config"

/**
 * Root module: Postgres + Auth + User routes cho demo JWT.
 * (EN: Root module wiring Postgres with auth and user feature modules.)
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validateEnv,
            envFilePath: [".env.local", ".env"],
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: "postgres" as const,
                host: config.getOrThrow<string>("DATABASE_HOST"),
                port: config.getOrThrow<number>("DATABASE_PORT"),
                username: config.getOrThrow<string>("DATABASE_USER"),
                password: config.getOrThrow<string>("DATABASE_PASSWORD"),
                database: config.getOrThrow<string>("DATABASE_NAME"),
                entities: [User],
                // synchronize chỉ cho demo local — production nên migration (EN: auto-sync OK for lesson DB only)
                synchronize: true,
            }),
        }),
        AuthModule,
        UserModule,
    ],
})
export class AppModule {}
