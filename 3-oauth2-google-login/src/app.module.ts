import {
    Module,
} from "@nestjs/common"
import {
    ConfigModule,
    ConfigService,
} from "@nestjs/config"
import {
    validateEnv,
} from "./config/env.config"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    AuthModule,
} from "./modules/auth/auth.module"
import {
    User,
} from "./modules/user/user.entity"

/** Root module — Postgres + validated env + Google OAuth auth module. (EN: Root Nest module.) */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validateEnv,
            envFilePath: [".env"],
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: "postgres",
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
    ],
})
export class AppModule {}
