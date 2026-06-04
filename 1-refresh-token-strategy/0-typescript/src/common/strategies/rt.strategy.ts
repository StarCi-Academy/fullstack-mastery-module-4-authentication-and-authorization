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

/** Refresh JWT payload. */
export type RtJwtPayload = { sub: number };

/**
 * Passport `jwt-refresh` strategy extracting Bearer refresh JWT.
 */
@Injectable()
export class RtStrategy extends PassportStrategy(Strategy,
    "jwt-refresh") {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("jwt.refreshSecret"),
            passReqToCallback: true,
        })
    }

    /**
     * @param req — request for raw refresh string
     * @param payload — verified refresh claims
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
