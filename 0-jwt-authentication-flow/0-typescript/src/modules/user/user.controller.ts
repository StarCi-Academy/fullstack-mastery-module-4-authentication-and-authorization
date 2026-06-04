/**
 * REST controller for User feature.
 */
import {
    Controller,
    Get,
    Request,
    UseGuards,
} from "@nestjs/common"
import {
    JwtAuthGuard,
} from "../auth/jwt-auth.guard"
/**
 * Sample protected user routes requiring JWT.
 */
@Controller("users")
export class UserController {
    /**
     * Protected profile route demonstrating JwtAuthGuard.
     *
     * @param req — request with user from JWT
     */
    @UseGuards(JwtAuthGuard)
    @Get("profile")
    getProfile(@Request() req: { user: { userId: number } }) {
        return {
            message: "Bạn đã truy cập vào khu vực bảo mật!",
            user: {
                userId: req.user.userId,
            },
        }
    }
}
