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

/** Payload JWT sau khi verify — chỉ chứa subject user id trong demo nÃ y. (EN: Verified JWT payload shape.) */
export type JwtPayload = { sub: number };

/**
 * passport-jwt strategy: đọc Bearer token, verify signature & expiry.
 * (EN: passport-jwt strategy extracting Bearer tokens.)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>("jwt.accessSecret"),
        })
    }

    /**
     * Chuẩn hoá `req.user` cho các guard/controller phía sau.
     * (EN: Normalize request user attached after successful JWT verification.)
     *
     * @param payload — Claims đã decode (EN: decoded JWT claims).
     * @returns `{ userId }` để guard đính vào request (EN: minimal user shape on request).
     */
    validate(payload: JwtPayload) {
        return {
            userId: payload.sub,
        }
    }
}
