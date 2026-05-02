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
} from "../../common/strategies/at.strategy"
import {
    RtStrategy,
} from "../../common/strategies/rt.strategy"
import {
    User,
} from "../user/user.entity"
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
        TypeOrmModule.forFeature([User]),
        PassportModule.register({
            defaultStrategy: "jwt",
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
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
