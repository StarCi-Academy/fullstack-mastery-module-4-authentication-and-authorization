/**
 * Passport strategy — jwt.strategy.
 * (EN: Passport strategy — jwt.strategy.)
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

/** JWT payload sau verify — chứa subject và role để downstream RBAC (EN: JWT claims incl. role.) */
export type JwtPayload = { sub: number; role: Role };

/**
 * passport-jwt đọc Bearer token và expose `{ userId, role }` cho middleware/controller chain.
 * (EN: Validates JWT and attaches normalized user info.)
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
     * @param payload — Claims verified by passport-jwt (EN: verified JWT payload).
     * @returns Object merged vào `req.user` cho RolesGuard đọc `role` (EN: normalized req.user).
     */
    validate(payload: JwtPayload) {
        return {
            userId: payload.sub,
            role: payload.role,
        }
    }
}
