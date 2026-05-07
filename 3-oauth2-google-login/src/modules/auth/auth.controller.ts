/**
 * Controller REST cho feature Auth.
 * (EN: REST controller for Auth feature.)
 */
import {
    Controller,
    Get,
    Req,
    UseGuards,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"
import {
    AuthService,
} from "./auth.service"
import {
    User,
} from "../user/user.entity"

/**
 * Hai endpoint OAuth dance — không chứa body JSON; Passport điá»u hướng trình duyệt (EN: OAuth redirect endpoints.)
 */
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Bắt đầu OAuth redirect sang Google consent screen (session:false pattern).
     * (EN: Starts Google OAuth authorization redirect.)
     */
    @Get("google")
    @UseGuards(AuthGuard("google"))
    googleRedirect() {
        /* Passport xử lý redirect — handler không cần response body (EN: Passport owns redirect.) */
        return
    }

    /**
     * Callback URL đăng ký trên Google Cloud — sau validate strategy trả JWT JSON cho client/demo tooling.
     * (EN: OAuth callback issuing JSON token response.)
     *
     * @param req — Express req có `user` lÃ  entity User sau validate() (EN: request carrying hydrated User).
     */
    @Get("google/callback")
    @UseGuards(AuthGuard("google"))
    async googleCallback(@Req() req: { user: User }) {
        return this.authService.completeGoogleLogin(req.user)
    }
}
