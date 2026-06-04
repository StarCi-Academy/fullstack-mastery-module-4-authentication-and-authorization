/**
 * REST controller for Auth feature.
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
 * Auth HTTP surface matching lesson curl flows.
 */
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Registers user; returns created id/email.
     */
    @Post("signup")
    @HttpCode(HttpStatus.CREATED)
    signUp(@Body() body: SignUpDto) {
        return this.authService.signUp(body)
    }

    /**
     * Issues AT/RT pair and persists refresh hash.
     */
    @Post("signin")
    @HttpCode(HttpStatus.OK)
    signIn(@Body() body: SignInDto) {
        return this.authService.signIn(body)
    }

    /** Refresh uses JSON body. */
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @UseGuards(RtGuard)
    refresh(@Req() req: { user: { sub: number; refreshToken: string } }) {
        return this.authService.refreshTokens(req.user.sub,
            req.user.refreshToken)
    }

    /**
     * Requires bearer access token so server knows whose refresh hash to clear.
     */
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AtGuard)
    logout(@Req() req: { user: { userId: number } }) {
        return this.authService.logout(req.user.userId)
    }
}
