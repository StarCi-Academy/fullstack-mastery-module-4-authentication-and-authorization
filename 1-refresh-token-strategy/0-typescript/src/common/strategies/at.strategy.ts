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
export type AtJwtPayload = { sub: number };

/**
 * Passport `jwt` strategy for short-lived access tokens.
 */
@Injectable()
export class AtStrategy extends PassportStrategy(Strategy,
    "jwt") {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("jwt.secret"),
        })
    }

    /**
     * Normalize request user for guards/controllers.
     *
     * @param payload — verified access JWT claims
     */
    validate(payload: AtJwtPayload) {
        return {
            userId: payload.sub,
        }
    }
}
