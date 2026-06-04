/**
 * REST controller for Auth feature.
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
 * Two OAuth dance endpoints — no JSON body; Passport navigates the browser.
 * OAuth redirect endpoints; mock branch bypasses the Google strategy for tests.
 */
@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly config: ConfigService,
    ) {}

    /**
     * Starts Google OAuth authorization redirect.
     */
    @Get("google")
    @UseGuards(AuthGuard("google"))
    googleRedirect(): void {
        /* Passport owns redirect. */
        return
    }

    /**
     * Callback URL registered on Google Cloud — after validating strategy returns JWT JSON to client/demo tooling.
     * OAuth callback issuing JSON token response; supports a mocked branch for tests.
     *
     * @param req — request carrying hydrated User + flag
     * @param code — query param for mock branch
     */
    @Get("google/callback")
    async googleCallback(
    @Req() req: { user?: { user: UserEntity; isNewUser: boolean } },
    @Query("code") code?: string,
    ): Promise<unknown> {
        const mockEnabled = this.config.get<string>("MOCK_GOOGLE") === "true"
        if (mockEnabled && code === "mockcode") {
            const { user, isNewUser } = await this.authService.findOrCreateGoogleUser({
                googleId: "mock-google-sub-123",
                email: "mock@demo.com",
                firstName: "Mock",
                lastName: "User",
                picture: undefined,
            })
            return this.authService.completeGoogleLogin(user,
                isNewUser)
        }

        return this.runRealCallback(req)
    }

    /**
     * Real branch — Passport executes the code exchange via AuthGuard("google").
     */
    @Get("google/callback/real")
    @UseGuards(AuthGuard("google"))
    async realGoogleCallback(
    @Req() req: { user: { user: UserEntity; isNewUser: boolean } },
    ): Promise<unknown> {
        return this.runRealCallback(req)
    }

    /**
     * Shared helper — issues JWT + isNewUser from a Passport-populated payload.
     */
    private async runRealCallback(
        req: { user?: { user: UserEntity; isNewUser: boolean } },
    ): Promise<unknown> {
        if (!req.user) {
            throw new UnauthorizedException("Google authentication failed")
        }
        return this.authService.completeGoogleLogin(req.user.user,
            req.user.isNewUser)
    }
}
