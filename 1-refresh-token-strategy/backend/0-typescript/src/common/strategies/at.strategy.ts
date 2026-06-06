/**
 * Passport strategy that validates short-lived ACCESS tokens (Bearer scheme).
 * Registered as "jwt" so that `AuthGuard("jwt")` (AtGuard) picks it up.
 */
import {
    Injectable,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    PassportStrategy,
} from "@nestjs/passport"
import {
    ExtractJwt,
    Strategy,
} from "passport-jwt"

/**
 * Shape of the verified access JWT payload.
 * `sub` carries the numeric user id set during token issuance.
 */
export type AtJwtPayload = { sub: number };

/**
 * Validates access JWTs using the AT_SECRET.
 * Passport calls `validate()` only after the signature and expiry pass.
 * The returned object is attached to `req.user` by Passport.
 */
@Injectable()
export class AtStrategy extends PassportStrategy(Strategy,
    "jwt") {
    constructor(config: ConfigService) {
        super({
            // Extract the token from the "Authorization: Bearer <token>" header.
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            // Reject expired tokens — 15 m TTL must be enforced.
            ignoreExpiration: false,
            // AT_SECRET from ConfigService; separate from refresh secret.
            secretOrKey: config.getOrThrow<string>("jwt.secret"),
        })
    }

    /**
     * Called by Passport after successful signature verification.
     * Shapes `req.user` to the form expected by AtGuard consumers.
     *
     * @param payload - verified access JWT claims containing `sub` (user id)
     * @returns object that becomes `req.user` in downstream handlers
     */
    validate(payload: AtJwtPayload) {
        // Expose as `userId` to match the naming used in controllers/logout.
        return {
            userId: payload.sub,
        }
    }
}
