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

/** Claims refresh JWT — chỉ `sub` trong demo. (EN: Refresh JWT payload.) */
export type RtJwtPayload = { sub: number };

/**
 * RtStrategy — verify refresh_token Bearer; đính raw RT vào `req.user.refreshToken`.
 * (EN: Passport `jwt-refresh` strategy extracting Bearer refresh JWT.)
 */
@Injectable()
export class RtStrategy extends PassportStrategy(Strategy,
    "jwt-refresh") {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("JWT_REFRESH_SECRET"),
            passReqToCallback: true,
        })
    }

    /**
     * @param req — HTTP request để đọc header Bearer (EN: request for raw refresh string).
     * @param payload — Claims refresh JWT đã verify (EN: verified refresh claims).
     */
    validate(req: Request, payload: RtJwtPayload) {
        const authHeader = req.get("authorization")
        const refreshToken = authHeader?.replace(/^Bearer\s+/i,
            "").trim() ?? ""
        return {
            sub: payload.sub,
            refreshToken,
        }
    }
}
