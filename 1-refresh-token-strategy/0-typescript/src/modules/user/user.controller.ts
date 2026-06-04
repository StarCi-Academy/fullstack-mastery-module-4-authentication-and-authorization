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
 * Sample protected routes requiring AtGuard / access JWT.
 */
@Controller("users")
export class UserController {
    /**
     * Protected profile route demonstrating AtGuard.
     *
     * @param req — request with user from JWT
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
