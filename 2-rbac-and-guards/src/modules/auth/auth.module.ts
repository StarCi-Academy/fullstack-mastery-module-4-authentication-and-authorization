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
    User,
} from "../user/user.entity"
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

/** Passport JWT + JwtModule export AuthService cho reuse nhá» trong demo (EN: Auth module wiring.) */
@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        PassportModule.register({
            defaultStrategy: "jwt",
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>("jwt.accessSecret"),
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
