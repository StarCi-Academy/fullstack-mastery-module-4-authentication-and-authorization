/**
 * Passport strategy — jwt.strategy.
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

/** Verified JWT payload shape. */
export type JwtPayload = { sub: number };

/**
 * passport-jwt strategy extracting Bearer tokens.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("jwt.secret"),
        })
    }

    /**
     * Normalize request user attached after successful JWT verification.
     *
     * @param payload — decoded JWT claims
     * @returns `{ userId }` minimal user shape on request
     */
    validate(payload: JwtPayload) {
        return {
            userId: payload.sub,
        }
    }
}
