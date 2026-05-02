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
    validateEnv,
} from "./config/env.config"
import {
    AuthModule,
} from "./modules/auth/auth.module"
import {
    UserModule,
} from "./modules/user/user.module"
import {
    User,
} from "./modules/user/user.entity"

/**
 * Root module: Postgres + Auth + User routes cho demo refresh rotation/revocation.
 * (EN: Root wiring validated env, Postgres, auth and user modules.)
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
                synchronize: true,
            }),
        }),
        AuthModule,
        UserModule,
    ],
})
export class AppModule {}
