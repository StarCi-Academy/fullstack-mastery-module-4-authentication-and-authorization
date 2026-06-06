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
 * Authentication endpoints — signup + signin.
 * No guard applied here; signin/signup must be publicly accessible by definition.
 */
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * Register a new account and return a confirmation message.
     * HTTP 201 Created on success; 409 Conflict if the email is taken.
     *
     * @param body — signup payload (email, password, optional role)
     * @returns Confirmation message
     */
    @Post("signup")
    @HttpCode(HttpStatus.CREATED) // override default 200 → explicit 201 for resource creation
    signUp(@Body() body: SignUpDto) {
        return this.authService.signUp(body)
    }

    /**
     * Validate credentials and return a signed JWT.
     * HTTP 200 OK on success; 401 Unauthorized on bad credentials.
     *
     * @param body — sign-in payload (email, password)
     * @returns `{ access_token }` — JWT embedding the user's role
     */
    @Post("signin")
    @HttpCode(HttpStatus.OK) // explicit 200 — @Post defaults to 201 without this decorator
    signIn(@Body() body: SignInDto) {
        return this.authService.signIn(body)
    }
}
