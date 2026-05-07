/**
 * Passport strategy — jwt.strategy.
 * (EN: Passport strategy — jwt.strategy.)
 */
import {
    Injectable,
} from "@nestjs/common"
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
 * Strategy chỉ đọc **access** JWT (Bearer); refresh không đi qua guard nÃ y.
 * (EN: Validates short-lived access JWT from Authorization header.)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_ACCESS_SECRET ?? "access-secret",
        })
    }

    /**
     * @param payload — Access JWT đã verify (EN: verified access claims).
     * @returns `{ userId }` cho controller/logout (EN: normalized request user).
     */
    validate(payload: AccessJwtPayload) {
        return {
            userId: payload.sub,
        }
    }
}
