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

/** Claims access JWT trong demo rotation/revocation. (EN: Access JWT payload.) */
export type AtJwtPayload = { sub: number };

/**
 * AtStrategy — verify access_token (Bearer) cho protected routes.
 * (EN: Passport `jwt` strategy for short-lived access tokens.)
 */
@Injectable()
export class AtStrategy extends PassportStrategy(Strategy,
    "jwt") {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        })
    }

    /**
     * Chuẩn hoá `req.user` giống module JWT cơ bản (`userId`).
     * (EN: Normalize request user for guards/controllers.)
     *
     * @param payload — Claims đã verify (EN: verified access JWT claims).
     */
    validate(payload: AtJwtPayload) {
        return {
            userId: payload.sub,
        }
    }
}
