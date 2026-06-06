/**
 * REST controller for Auth feature.
 * Exposes two OAuth dance endpoints — the browser drives navigation here;
 * no JSON request body is needed because Passport redirects the browser on its own.
 */
import {
    Controller,
    Get,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    AuthGuard,
} from "@nestjs/passport"
import {
    AuthService,
} from "./auth.service"
import {
    UserEntity,
} from "../../entities"

/**
 * Handles the two legs of the OAuth2 authorization-code flow:
 * 1. `/auth/google` — redirect to Google consent screen.
 * 2. `/auth/google/callback` — receive code, upsert user, issue JWT.
 *
 * A mock branch (activated via `MOCK_GOOGLE=true` env var) bypasses the real
 * Google network call so the entire flow can be exercised offline in tests/demos.
 */
@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly config: ConfigService,
    ) {}

    /**
     * Initiates the OAuth2 authorization-code flow by redirecting the browser to Google.
     * `AuthGuard("google")` intercepts the request BEFORE the handler body executes and
     * emits the HTTP 302 redirect — so the handler body is intentionally empty.
     *
     * @returns void — Passport emits the redirect; no return value reaches the client.
     */
    @Get("google")
    @UseGuards(AuthGuard("google"))
    googleRedirect(): void {
        // Passport owns the redirect; this body never executes for a real request.
        return
    }

    /**
     * Receives the OAuth authorization code from Google (or a mock code for testing),
     * upserts the local user, signs an internal JWT, and returns it as JSON.
     *
     * Two branches exist:
     * - **Mock** (`MOCK_GOOGLE=true` + `?code=mockcode`): skips the live Google call and
     *   uses a fixed profile so tests/demos can run fully offline.
     * - **Real**: delegates to `runRealCallback` which reads the Passport-populated `req.user`.
     *
     * @param req — NestJS request object; `req.user` is populated by Passport after strategy validate().
     * @param code — query param forwarded by Google (or `"mockcode"` for mock tests).
     * @returns JSON containing `access_token`, `isNewUser`, and `user` fields.
     */
    @Get("google/callback")
    async googleCallback(
    @Req() req: { user?: { user: UserEntity; isNewUser: boolean } },
    @Query("code") code?: string,
    ): Promise<unknown> {
        // Read the mock flag from env — must be "true" string, not just truthy.
        const mockEnabled = this.config.get<string>("MOCK_GOOGLE") === "true"

        // Mock branch: bypass live Google call for offline testing.
        // Uses a fixed profile so the upsert logic is still exercised deterministically.
        if (mockEnabled && code === "mockcode") {
            const { user, isNewUser } = await this.authService.findOrCreateGoogleUser({
                googleId: "mock-google-sub-123",
                email: "mock@demo.com",
                firstName: "Mock",
                lastName: "User",
                picture: undefined,
            })
            // Issue JWT using the same path as the real flow — no special mock response shape.
            return this.authService.completeGoogleLogin(user,
                isNewUser)
        }

        // Real flow: req.user was populated by GoogleStrategy.validate() via AuthGuard.
        return this.runRealCallback(req)
    }

    /**
     * Alternative callback route that always enforces the real Google strategy guard.
     * Used when mock mode is off and a strict guard is required on the callback itself.
     *
     * @param req — request with Passport-populated user payload.
     * @returns same JWT JSON shape as the mock callback.
     */
    @Get("google/callback/real")
    @UseGuards(AuthGuard("google"))
    async realGoogleCallback(
    @Req() req: { user: { user: UserEntity; isNewUser: boolean } },
    ): Promise<unknown> {
        return this.runRealCallback(req)
    }

    /**
     * Shared completion step — converts a Passport-populated request user into a JWT response.
     * Throws if Passport failed to populate `req.user` (e.g. strategy threw an exception).
     *
     * @param req — request carrying optional user payload from Passport.
     * @returns signed JWT JSON via AuthService.
     * @throws UnauthorizedException when req.user is absent.
     */
    private async runRealCallback(
        req: { user?: { user: UserEntity; isNewUser: boolean } },
    ): Promise<unknown> {
        // Guard: Passport sets req.user only on success — absence means the strategy rejected the token.
        if (!req.user) {
            throw new UnauthorizedException("Google authentication failed")
        }
        return this.authService.completeGoogleLogin(req.user.user,
            req.user.isNewUser)
    }
}
