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
    AtStrategy,
    RtStrategy,
} from "../../common"
import {
    UserEntity,
} from "../../entities"
import {
    AuthController,
} from "./auth.controller"
import {
    AuthService,
} from "./auth.service"

/**
 * AtStrategy + RtStrategy + JwtModule (access TTL mặc định); refresh ký trong AuthService với secret riêng.
 * (EN: Wires dual Passport JWT strategies and JwtModule for access-token defaults.)
 */
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
                    expiresIn: "15m",
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        AtStrategy,
        RtStrategy,
    ],
    exports: [AuthService],
})
export class AuthModule {}
