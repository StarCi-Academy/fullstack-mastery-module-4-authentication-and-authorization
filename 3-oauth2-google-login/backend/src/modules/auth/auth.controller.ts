/**
 * Controller REST cho feature Auth.
 * (EN: REST controller for Auth feature.)
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
 * Hai endpoint OAuth dance — không chứa body JSON; Passport điều hướng trình duyệt.
 * Khi `MOCK_GOOGLE=true`, callback chấp nhận `?code=mockcode` và bỏ qua AuthGuard Google.
 * (EN: OAuth redirect endpoints; mock branch bypasses the Google strategy for tests.)
 */
@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly config: ConfigService,
    ) {}

    /**
     * Bắt đầu OAuth redirect sang Google consent screen (session:false pattern).
     * (EN: Starts Google OAuth authorization redirect.)
     */
    @Get("google")
    @UseGuards(AuthGuard("google"))
    googleRedirect(): void {
        /* Passport xử lý redirect — handler không cần response body (EN: Passport owns redirect.) */
        return
    }

    /**
     * Callback URL đăng ký trên Google Cloud — sau validate strategy trả JWT JSON cho client/demo tooling.
     * Khi env `MOCK_GOOGLE=true` và query `code=mockcode`, bypass strategy và dùng profile cố định để demo/test.
     * (EN: OAuth callback issuing JSON token response; supports a mocked branch for tests.)
     *
     * @param req — Express req có `user = { user, isNewUser }` sau validate() (EN: request carrying hydrated User + flag).
     * @param code — Query `?code=...` để kích hoạt nhánh mock (EN: query param for mock branch).
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
     * Nhánh thực tế — dùng AuthGuard("google") để Passport thực thi code exchange.
     * (EN: Real branch — Passport executes the code exchange via AuthGuard("google").)
     */
    @Get("google/callback/real")
    @UseGuards(AuthGuard("google"))
    async realGoogleCallback(
    @Req() req: { user: { user: UserEntity; isNewUser: boolean } },
    ): Promise<unknown> {
        return this.runRealCallback(req)
    }

    /**
     * Helper chia sẻ — issue JWT + isNewUser từ payload AuthGuard("google") đã set.
     * (EN: Shared helper — issues JWT + isNewUser from a Passport-populated payload.)
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
