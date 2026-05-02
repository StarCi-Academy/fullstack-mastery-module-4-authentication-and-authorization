import {
    Controller,
    Get,
    UseGuards,
} from "@nestjs/common"
import {
    Roles,
} from "../../common/decorators/roles.decorator"
import {
    Role,
} from "../../common/role.enum"
import {
    RolesGuard,
} from "../../common/guards/roles.guard"
import {
    JwtAuthGuard,
} from "../auth/jwt-auth.guard"

/**
 * Namespace ví dụ chỉ ADMIN được vào sau guard chain Jwt → Roles.
 * (EN: Sample admin-only controller illustrating guard ordering.)
 */
@Controller("admin")
export class AdminController {
    /**
     * Guard ordering matters: JwtAuthGuard establishes identity; RolesGuard enforces privilege.
     * (EN: Sequential guards.)
     */
    @UseGuards(JwtAuthGuard,
        RolesGuard)
    @Roles(Role.ADMIN)
    @Get("dashboard")
    getDashboard() {
        return {
            message: "Chào mừng Admin vào khu vực mật!",
            stats: {
                users: 100,
                orders: 15,
            },
        }
    }
}
