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
    SignUpDto,
} from "./dto"

/** `/auth/signup|signin` — không chứa route nhạy cảm RBAC (EN: authentication endpoints only.) */
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("signup")
    @HttpCode(HttpStatus.CREATED)
    signUp(@Body() body: SignUpDto) {
        return this.authService.signUp(body)
    }

    @Post("signin")
    @HttpCode(HttpStatus.OK)
    signIn(@Body() body: SignInDto) {
        return this.authService.signIn(body)
    }
}
