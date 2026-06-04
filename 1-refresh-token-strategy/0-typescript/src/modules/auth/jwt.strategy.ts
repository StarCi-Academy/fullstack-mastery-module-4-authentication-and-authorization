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

/** Access JWT payload. */
export type AccessJwtPayload = { sub: number };

/**
 * Validates short-lived access JWT from Authorization header.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    /**
     * Inject ConfigService to read secret from jwt.config — no direct process.env access.
     */
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("jwt.secret"),
        })
    }

    /**
     * @param payload — verified access claims
     * @returns `{ userId }` normalized request user
     */
    validate(payload: AccessJwtPayload): { userId: number } {
        return {
            userId: payload.sub,
        }
    }
}
