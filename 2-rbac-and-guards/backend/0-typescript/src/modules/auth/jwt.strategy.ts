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
import {
    Role,
} from "../../common"

/** JWT claims incl. role. */
export type JwtPayload = { sub: number; role: Role };

/**
 * Validates JWT and attaches normalized user info.
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
     * @param payload — verified JWT payload
     * @returns Object normalized req.user
     */
    validate(payload: JwtPayload) {
        return {
            userId: payload.sub,
            role: payload.role,
        }
    }
}
