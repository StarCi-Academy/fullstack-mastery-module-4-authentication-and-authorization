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
} from "../../common/guards/at.guard"
import {
    RtGuard,
} from "../../common/guards/rt.guard"
import {
    AuthService,
} from "./auth.service"
import {
    SignInDto,
} from "./dto/signin.dto"
import {
    SignUpDto,
} from "./dto/signup.dto"

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

    /**
     * `POST /auth/refresh` — Bearer refresh_token; RtGuard verify JWT rồi AuthService rotate.
     * (EN: Refresh uses Authorization Bearer refresh JWT per lesson.)
     */
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @UseGuards(RtGuard)
    refresh(@Req() req: { user: { sub: number; refreshToken: string } }) {
        return this.authService.refreshTokens(req.user.sub,
            req.user.refreshToken)
    }

    /**
     * `POST /auth/logout` — Bearer access_token; xóa refreshTokenHash (revoke mọi RT).
     * (EN: Requires access JWT to clear stored refresh hash.)
     */
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AtGuard)
    logout(@Req() req: { user: { userId: number } }) {
        return this.authService.logout(req.user.userId)
    }
}
