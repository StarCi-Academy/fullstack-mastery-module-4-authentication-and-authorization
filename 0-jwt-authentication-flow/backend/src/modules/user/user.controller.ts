/**
 * Controller REST cho feature User.
 * (EN: REST controller for User feature.)
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
 * Routes ví dụ cho resource sau khi đã authenticated.
 * (EN: Sample protected user routes requiring JWT.)
 */
@Controller("users")
export class UserController {
    /**
     * `GET /users/profile` — chỉ vào được khi Bearer JWT hợp lệ.
     * (EN: Protected profile route demonstrating JwtAuthGuard.)
     *
     * @param req — Express request có `user` do JwtStrategy gán (EN: request with user from JWT).
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
