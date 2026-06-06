/**
 * HTTP controller exposing the four auth endpoints used in the lesson flows:
 *  POST /auth/signup   — register a new user
 *  POST /auth/signin   — authenticate and receive AT+RT pair
 *  POST /auth/refresh  — rotate tokens (protected by RtGuard)
 *  POST /auth/logout   — revoke RT (protected by AtGuard)
 *
 * The controller is intentionally thin — all business logic lives in AuthService.
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
 * Provides the public auth API surface.
 * The "auth" prefix is resolved by the global prefix set in bootstrap.ts.
 */
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Registers a new account.
     * Returns HTTP 201 with `{ id, email }` — no tokens issued at signup.
     *
     * @param body - signup payload validated by SignUpDto
     */
    @Post("signup")
    @HttpCode(HttpStatus.CREATED) // explicit 201 — NestJS default POST is 201 but declared for clarity
    signUp(@Body() body: SignUpDto) {
        return this.authService.signUp(body)
    }

    /**
     * Authenticates credentials and issues an AT+RT pair.
     * Returns HTTP 200 with `{ access_token, refresh_token }`.
     *
     * @param body - signin payload validated by SignInDto
     */
    @Post("signin")
    @HttpCode(HttpStatus.OK) // override default 201 to match lesson contract (200)
    signIn(@Body() body: SignInDto) {
        return this.authService.signIn(body)
    }

    /**
     * Rotates the token pair given a valid refresh token in the Authorization header.
     * RtGuard runs RtStrategy which validates the JWT signature and attaches
     * `req.user = { sub, refreshToken }` before this handler executes.
     *
     * @param req - request with user populated by RtGuard/RtStrategy
     * @returns new `{ access_token, refresh_token }` pair
     */
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @UseGuards(RtGuard) // validates RT signature; populates req.user.sub + req.user.refreshToken
    refresh(@Req() req: { user: { sub: number; refreshToken: string } }) {
        // Pass both the user id (for DB lookup) and raw token string (for bcrypt comparison).
        return this.authService.refreshTokens(req.user.sub,
            req.user.refreshToken)
    }

    /**
     * Revokes the active refresh token by setting its hash to null in the DB.
     * Requires a valid access token so the server can identify which user to log out.
     * AtGuard validates the AT and sets `req.user.userId`.
     *
     * @param req - request with user populated by AtGuard/AtStrategy
     * @returns `{ message: "Logged out" }`
     */
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @UseGuards(AtGuard) // validates AT; ensures only authenticated users can trigger revocation
    logout(@Req() req: { user: { userId: number } }) {
        return this.authService.logout(req.user.userId)
    }
}
