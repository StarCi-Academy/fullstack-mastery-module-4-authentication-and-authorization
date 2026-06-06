/**
 * Passport strategy that validates long-lived REFRESH tokens (Bearer scheme).
 * Registered as "jwt-refresh" so that `AuthGuard("jwt-refresh")` (RtGuard) picks it up.
 * Requires `passReqToCallback: true` so the raw token string can be extracted for bcrypt comparison.
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
import type {
    Request,
} from "express"

/**
 * Shape of the verified refresh JWT payload.
 * `sub` carries the numeric user id embedded at issuance.
 */
export type RtJwtPayload = { sub: number };

/**
 * Validates refresh JWTs using the RT_SECRET (separate from AT_SECRET).
 * Also forwards the raw token string so AuthService can run bcrypt.compare
 * against the stored hash — preventing replay of rotated or revoked tokens.
 */
@Injectable()
export class RtStrategy extends PassportStrategy(Strategy,
    "jwt-refresh") {
    constructor(config: ConfigService) {
        super({
            // Extract token from "Authorization: Bearer <rt>" header.
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            // Expired refresh tokens must be rejected — do not allow silent renewal.
            ignoreExpiration: false,
            // RT_SECRET is distinct from AT_SECRET to prevent cross-use of token types.
            secretOrKey: config.getOrThrow<string>("jwt.refreshSecret"),
            // Must be true so `validate()` receives the Request and can read raw Bearer string.
            passReqToCallback: true,
        })
    }

    /**
     * Called by Passport after signature/expiry verification.
     * Extracts the raw token string from the header so AuthService.refreshTokens
     * can compare it against the bcrypt hash stored in the DB.
     *
     * @param req - incoming request (needed to read raw Authorization header)
     * @param payload - verified refresh JWT claims containing `sub`
     * @returns object set as `req.user`; contains both `sub` and raw `refreshToken`
     */
    validate(req: Request, payload: RtJwtPayload) {
        // Re-read the Authorization header to extract the raw token string.
        // Passport already validated the signature; we just need the plaintext for bcrypt.compare.
        const authHeader = req.get("authorization")
        const refreshToken = authHeader?.replace(/^Bearer\s+/i,
            "").trim() ?? ""
        return {
            sub: payload.sub,
            refreshToken, // forwarded to AuthService.refreshTokens for hash comparison
        }
    }
}
