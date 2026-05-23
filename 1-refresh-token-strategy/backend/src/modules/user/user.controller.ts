import {
    Controller,
    Get,
    Request,
    UseGuards,
} from "@nestjs/common"
import {
    AtGuard,
} from "../../common"

/**
 * Routes ví dụ cho resource sau khi đã authenticated (access JWT).
 * (EN: Sample protected routes requiring AtGuard / access JWT.)
 */
@Controller("users")
export class UserController {
    /**
     * `GET /users/profile` — chỉ vào được khi Bearer access JWT hợp lệ.
     * (EN: Protected profile route demonstrating AtGuard.)
     *
     * @param req — Request có `user` do AtStrategy gán (EN: request with user from JWT).
     */
    @UseGuards(AtGuard)
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
