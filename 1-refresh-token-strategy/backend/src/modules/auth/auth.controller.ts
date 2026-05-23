/**
 * Controller REST cho feature Auth.
 * (EN: REST controller for Auth feature.)
 */
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseGuards,
} from "@nestjs/common"
import {
    AtGuard,
    RtGuard,
} from "../../common"
import {
    AuthService,
} from "./auth.service"
import {
    SignInDto,
    SignUpDto,
} from "./dto"

/**
 * REST `/auth/*` — signup/signin/refresh/logout theo luồng rotation + revocation trong bài học.
 * (EN: Auth HTTP surface matching lesson curl flows.)
 */
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * `POST /auth/signup` — 201 Created sau khi user được lưu (payload giống module JWT cơ bản).
     * (EN: Registers user; returns created id/email.)
     */
    @Post("signup")
    @HttpCode(HttpStatus.CREATED)
    signUp(@Body() body: SignUpDto) {
        return this.authService.signUp(body)
    }

    /**
     * `POST /auth/signin` — trả cặp access_token + refresh_token; hash RT lưu DB.
     * (EN: Issues AT/RT pair and persists refresh hash.)
     */
    @Post("signin")
    @HttpCode(HttpStatus.OK)
    signIn(@Body() body: SignInDto) {
        return this.authService.signIn(body)
    }

    /** Body chỉ chứa refresh_token — không dùng Bearer refresh trong demo này. (EN: Refresh uses JSON body.) */
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @UseGuards(RtGuard)
    refresh(@Req() req: { user: { sub: number; refreshToken: string } }) {
        return this.authService.refreshTokens(req.user.sub,
            req.user.refreshToken)
    }

    /**
     * Cần access JWT để biết userId revoke refresh hash (AuthZ tối thiểu).
     * (EN: Requires bearer access token so server knows whose refresh hash to clear.)
     */
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AtGuard)
    logout(@Req() req: { user: { userId: number } }) {
        return this.authService.logout(req.user.userId)
    }
}
