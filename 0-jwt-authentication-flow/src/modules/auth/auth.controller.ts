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
} from "@nestjs/common"
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
 * REST endpoints `/auth/*` cho luồng đăng ký và đăng nhập JWT.
 * (EN: REST `/auth/*` surface for JWT lesson signup/signin.)
 */
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * `POST /auth/signup` — 201 Created sau khi user được lưu.
     * (EN: Registers user and returns created acknowledgement.)
     *
     * @param body - Payload validated by SignUpDto (EN: validated signup body).
     */
    @Post("signup")
    @HttpCode(HttpStatus.CREATED)
    signUp(@Body() body: SignUpDto) {
        return this.authService.signUp(body)
    }

    /**
     * `POST /auth/signin` — trả JWT access_token khi credential đúng.
     * (EN: Issues JWT access token when credentials match.)
     *
     * @param body - Payload validated by SignInDto (EN: validated sign-in body).
     */
    @Post("signin")
    @HttpCode(HttpStatus.OK)
    signIn(@Body() body: SignInDto) {
        return this.authService.signIn(body)
    }
}
