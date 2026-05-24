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
} from "../../entities"
import {
    AdminSeedService,
} from "./admin-seed.service"
import {
    AuthController,
} from "./auth.controller"
import {
    AuthService,
} from "./auth.service"
import {
    GoogleStrategy,
} from "./google.strategy"

/** Passport session disabled — chỉ redirect OAuth stateless đủ cho demo JWT sau callback. (EN: Stateless OAuth wiring.) */
@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        PassportModule.register({
            session: false,
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
        GoogleStrategy,
    ],
})
export class AuthModule {}
