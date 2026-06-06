/**
 * REST controller for Auth feature.
 * Exposes `/auth/signup` (HTTP 201) and `/auth/signin` (HTTP 200).
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
 * All endpoints are unauthenticated — they issue or create credentials.
 */
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Registers a new user and returns a minimal acknowledgement.
     * HTTP 201 Created — body is validated by `SignUpDto` before reaching the service.
     *
     * @param body - validated signup body (email + password)
     */
    @Post("signup")
    @HttpCode(HttpStatus.CREATED) // Override default 200 — creation is 201 per REST semantics
    signUp(@Body() body: SignUpDto) {
        return this.authService.signUp(body)
    }

    /**
     * Issues a JWT access token when credentials match.
     * HTTP 200 OK — intentionally not 201, since no resource is created on sign-in.
     *
     * @param body - validated sign-in body (email + password)
     */
    @Post("signin")
    @HttpCode(HttpStatus.OK)
    signIn(@Body() body: SignInDto) {
        return this.authService.signIn(body)
    }
}
