/**
 * Passport strategy for Google OAuth2 — google.strategy.
 * Registered under the name "google" so `AuthGuard("google")` can resolve it automatically.
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
 * Passport strategy that handles the server-side leg of the Google OAuth2
 * authorization-code flow.  Passport calls {@link validate} AFTER it has:
 * 1. Built the redirect URL with `client_id`, `scope`, and a random `state`.
 * 2. Received the callback `code` from Google.
 * 3. Exchanged the `code` for an access token + profile via Google's token endpoint.
 *
 * The strategy itself never stores credentials — it simply normalises the Google
 * Profile into a payload and delegates persistence to {@link AuthService}.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy,
    "google") {
    constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    ) {
        super({
            // clientID / clientSecret must be registered on Google Cloud Console.
            // Empty strings make the strategy load without crashing when MOCK_GOOGLE=true;
            // real network calls will fail until valid credentials are provided.
            clientID: config.get<string>("GOOGLE_CLIENT_ID") ?? "",
            clientSecret: config.get<string>("GOOGLE_CLIENT_SECRET") ?? "",
            // callbackURL must match the Authorized Redirect URI in Google Cloud Console exactly.
            callbackURL: config.getOrThrow<string>("GOOGLE_CALLBACK_URL"),
            // Request only email + profile — least-privilege principle;
            // we don't need offline access or any sensitive scopes.
            scope: [
                "email",
                "profile",
            ],
        })
    }

    /**
     * Called by Passport after successfully exchanging the authorization code for a Profile.
     * The returned value is attached to `req.user` by Passport and read by the controller.
     *
     * @param _accessToken — Google access token (unused; we don't call Google APIs after login).
     * @param _refreshToken — Google refresh token (unused; session management is via our own JWT).
     * @param profile — Google Profile object containing id, emails, name, photos.
     * @returns object with `{ user, isNewUser }` attached to `req.user` for the controller.
     * @throws UnauthorizedException when the Google account exposes no email address.
     */
    async validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
    ) {
        // Extract the primary email; Google accounts normally have one but it can be hidden.
        const email = profile.emails?.[0]?.value
        if (!email) {
            // Without an email we have no reliable upsert key — reject the login.
            throw new UnauthorizedException("Google account has no email")
        }

        // Delegate persistence — strategy stays thin, no DB logic here.
        const { user, isNewUser } = await this.authService.findOrCreateGoogleUser({
            googleId: profile.id,   // stable `sub` identifier from Google
            email,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            picture: profile.photos?.[0]?.value,
        })

        // Passport attaches this return value to req.user — controller reads it after validation.
        return {
            user,
            isNewUser,
        }
    }
}
