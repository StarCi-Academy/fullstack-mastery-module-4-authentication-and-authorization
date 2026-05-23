/**
 * AuthModule — đăng ký các thành phần của feature Auth.
 * (EN: AuthModule — registers components for Auth feature.)
 */
import {
    Module,
} from "@nestjs/common"
import {
    ConfigModule,
    ConfigService,
} from "@nestjs/config"
import {
    JwtModule,
} from "@nestjs/jwt"
import {
    PassportModule,
} from "@nestjs/passport"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    UserEntity,
} from "../user"
import {
    AuthController,
} from "./auth.controller"
import {
    AdminSeedService,
} from "./admin-seed.service"
import {
    AuthService,
} from "./auth.service"
import {
    JwtStrategy,
} from "./jwt.strategy"

/** Passport JWT + JwtModule export AuthService cho reuse nhỏ trong demo (EN: Auth module wiring.) */
@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        PassportModule.register({
            defaultStrategy: "jwt",
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>("jwt.secret"),
                signOptions: {
                    expiresIn: "7d",
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        AdminSeedService,
        JwtStrategy,
    ],
    exports: [AuthService],
})
export class AuthModule {}
