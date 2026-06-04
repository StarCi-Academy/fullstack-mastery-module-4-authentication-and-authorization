/**
 * REST controller exposing admin, editor and public-health endpoints for the RBAC demo.
 */
import {
    Controller,
    Get,
    UseGuards,
} from "@nestjs/common"
import {
    Public,
    Role,
    Roles,
    RolesGuard,
} from "../../common"
import {
    JwtAuthGuard,
} from "../auth"

/**
 * Ba namespace:
 *  - `/admin/dashboard` indicates ADMIN (single-role).
 *  - `/editor/articles` ADMIN or EDITOR (multi-role OR).
 * Three namespaces — admin single-role, editor multi-role OR, public bypass.
 */
@Controller()
@UseGuards(JwtAuthGuard,
    RolesGuard)
export class AdminController {
    /**
     * Admin-only dashboard demonstrating single-role gating.
     *
     * @returns Thông mock dashboard payload
     */
    @Roles(Role.ADMIN)
    @Get("admin/dashboard")
    getAdminDashboard(): { message: string; stats: { users: number; orders: number } } {
        return {
            message: "Chào mừng Admin vào khu vực mật!",
            stats: {
                users: 100,
                orders: 15,
            },
        }
    }

    /**
     * Allows either ADMIN or EDITOR — multi-role OR demo.
     *
     * @returns Danh mock articles payload
     */
    @Roles(Role.ADMIN,
        Role.EDITOR)
    @Get("editor/articles")
    getEditorArticles(): { message: string; articles: Array<{ id: number; title: string }> } {
        return {
            message: "Editor area — admin và editor đều xem được.",
            articles: [
                {
                    id: 1,
                    title: "Hello RBAC",
                },
                {
                    id: 2,
                    title: "Multi-role OR check",
                },
            ],
        }
    }

    /**
     * Public health endpoint — @Public() bypasses the JWT guard entirely.
     *
     * @returns Trạng simple liveness payload
     */
    @Public()
    @Get("public/health")
    getPublicHealth(): { status: string } {
        return {
            status: "ok",
        }
    }
}
