/**
 * AuthModule — registers all components required for JWT-based authentication.
 * Wires Passport, JwtModule (for signing), TypeORM repos, and the auth guard.
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
    UserCredentialEntity,
    UserEntity,
} from "../../entities"
import {
    AuthController,
} from "./auth.controller"
import {
    AuthService,
} from "./auth.service"
import {
    JwtAuthGuard,
} from "./jwt-auth.guard"
import {
    JwtStrategy,
} from "./jwt.strategy"

/**
 * Wires the Passport "jwt" strategy with `JwtModule` so the app can both
 * sign tokens (at sign-in) and verify them (on protected routes).
 *
 * `exports: [JwtAuthGuard]` allows sibling modules (e.g. `UserModule`) to
 * use the guard without re-importing the full auth setup.
 */
@Module({
    imports: [
        // Give AuthService access to `UserEntity` and `UserCredentialEntity` repositories
        TypeOrmModule.forFeature([UserEntity, UserCredentialEntity]),

        // Register Passport with "jwt" as the default strategy — used by `JwtAuthGuard`
        PassportModule.register({
            defaultStrategy: "jwt",
        }),

        // Configure JwtModule asynchronously to read the secret from ConfigService
        JwtModule.registerAsync({
            imports: [ConfigModule],  // Make ConfigService injectable inside the factory
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                // The signing secret — must match the `secretOrKey` used in JwtStrategy
                secret: config.getOrThrow<string>("jwt.secret"),
                signOptions: {
                    // Default expiry applied to every `jwtService.signAsync()` call
                    expiresIn: "7d",
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,   // Business logic (bcrypt + sign)
        JwtStrategy,   // Passport strategy (verify + shape req.user)
        JwtAuthGuard,  // Guard that activates the strategy on protected routes
    ],
    // Export JwtAuthGuard so other modules can use it without re-importing AuthModule
    exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
