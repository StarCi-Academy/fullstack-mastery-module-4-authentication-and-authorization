/**
 * Passport strategy — jwt.strategy.
 * Validates incoming Bearer tokens and shapes the request user object.
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
 * Verified JWT payload shape after signature check.
 * `sub` is the numeric user id embedded at sign-in time.
 */
export type JwtPayload = { sub: number };

/**
 * Passport "jwt" strategy that extracts and verifies Bearer tokens.
 *
 * Passport calls this strategy automatically when `JwtAuthGuard` is active.
 * It:
 *  1. Reads the `Authorization: Bearer <token>` header.
 *  2. Verifies the HMAC signature against the shared secret.
 *  3. Checks the `exp` claim to reject expired tokens.
 *  4. Passes the decoded payload to `validate()`.
 * No database or session lookup is needed — this is the core of stateless auth.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(config: ConfigService) {
        super({
            // Extract the raw JWT string from the Authorization header's Bearer scheme
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

            // Reject tokens whose `exp` claim is in the past (enforces short-lived tokens)
            ignoreExpiration: false,

            // The same secret used to sign at sign-in time — must match exactly to verify
            secretOrKey: config.getOrThrow<string>("jwt.secret"),
        })
    }

    /**
     * Runs only after signature and expiry are validated by Passport.
     * Shapes the minimal `req.user` object that downstream handlers receive.
     *
     * @param payload - decoded JWT claims (already verified)
     * @returns `{ userId }` — only the user id, not the full user record
     */
    validate(payload: JwtPayload) {
        // Map `sub` claim to `userId` for clarity in route handlers
        // No DB call here — the signature proof is sufficient for identity
        return {
            userId: payload.sub,
        }
    }
}
