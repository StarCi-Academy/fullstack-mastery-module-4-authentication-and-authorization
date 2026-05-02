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
    validateEnv,
} from "./config/env.config"
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

/** Root — Postgres + Auth + Admin resource RBAC. (EN: Root module for RBAC demo.) */
@Module({
    controllers: [AppController],
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
        AdminModule,
    ],
})
export class AppModule {}
