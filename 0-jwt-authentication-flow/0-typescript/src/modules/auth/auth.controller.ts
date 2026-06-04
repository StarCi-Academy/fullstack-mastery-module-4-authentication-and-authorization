/**
 * REST controller for Auth feature.
 */
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
} from "@nestjs/common"
import {
    AuthService,
} from "./auth.service"
import {
    SignInDto,
    SignUpDto,
} from "./dto"

/**
 * REST `/auth/*` surface for JWT lesson signup/signin.
 */
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Registers user and returns created acknowledgement.
     *
     * @param body - validated signup body
     */
    @Post("signup")
    @HttpCode(HttpStatus.CREATED)
    signUp(@Body() body: SignUpDto) {
        return this.authService.signUp(body)
    }

    /**
     * Issues JWT access token when credentials match.
     *
     * @param body - validated sign-in body
     */
    @Post("signin")
    @HttpCode(HttpStatus.OK)
    signIn(@Body() body: SignInDto) {
        return this.authService.signIn(body)
    }
}
