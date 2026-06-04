/**
 * Passport strategy — google.strategy.
 */
import {
    Injectable,
    UnauthorizedException,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    PassportStrategy,
} from "@nestjs/passport"
import {
    Strategy,
    Profile,
} from "passport-google-oauth20"
import {
    AuthService,
} from "./auth.service"

/**
 * Google OAuth2 strategy delegating persistence to AuthService.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy,
    "google") {
    constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    ) {
        super({
            clientID: config.get<string>("GOOGLE_CLIENT_ID") ?? "",
            clientSecret: config.get<string>("GOOGLE_CLIENT_SECRET") ?? "",
            callbackURL: config.getOrThrow<string>("GOOGLE_CALLBACK_URL"),
            scope: [
                "email",
                "profile",
            ],
        })
    }

    /**
     * Validates profile contains email then upserts local user.
     *
     * @param _accessToken — unused OAuth access token
     * @param _refreshToken — unused refresh token
     * @param profile — Google profile object
     * @returns User hydrated User for controller
     */
    async validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
    ) {
        const email = profile.emails?.[0]?.value
        if (!email) {
            throw new UnauthorizedException("Google account has no email")
        }

        const { user, isNewUser } = await this.authService.findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            picture: profile.photos?.[0]?.value,
        })

        return {
            user,
            isNewUser,
        }
    }
}
