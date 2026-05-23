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

/** Claims của access JWT trong demo refresh-strategy. (EN: Access JWT payload.) */
export type AccessJwtPayload = { sub: number };

/**
 * Strategy chỉ đọc **access** JWT (Bearer); refresh không đi qua guard này.
 * (EN: Validates short-lived access JWT from Authorization header.)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    /**
     * Inject ConfigService để lấy secret từ jwt.config (không truy cập process.env trực tiếp).
     * (EN: Inject ConfigService to read secret from jwt.config — no direct process.env access.)
     */
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("jwt.secret"),
        })
    }

    /**
     * @param payload — Access JWT đã verify (EN: verified access claims).
     * @returns `{ userId }` cho controller/logout (EN: normalized request user).
     */
    validate(payload: AccessJwtPayload): { userId: number } {
        return {
            userId: payload.sub,
        }
    }
}
