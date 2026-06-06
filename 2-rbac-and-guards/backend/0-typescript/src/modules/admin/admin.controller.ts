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
 * Demo controller grouping three RBAC scenarios under one class-level guard pair.
 *
 * Guard order: JwtAuthGuard runs first (verifies token, populates req.user),
 * then RolesGuard compares the JWT role against @Roles() metadata.
 *
 * Routes:
 *  - GET /admin/dashboard   — ADMIN only (single-role gate)
 *  - GET /editor/articles   — ADMIN or EDITOR (multi-role OR)
 *  - GET /public/health     — no token required (@Public() bypasses both guards)
 */
@Controller()
@UseGuards(JwtAuthGuard, // first guard: verify + decode JWT → 401 if missing/invalid
    RolesGuard)           // second guard: compare role → 403 if insufficient
export class AdminController {
    /**
     * Admin-only dashboard — demonstrates single-role gating via @Roles(Role.ADMIN).
     * A valid EDITOR or USER token is rejected with 403 by RolesGuard.
     *
     * @returns Mock dashboard payload with user and order counts
     */
    @Roles(Role.ADMIN) // only ADMIN role passes through RolesGuard
    @Get("admin/dashboard")
    getAdminDashboard(): { message: string; stats: { users: number; orders: number } } {
        // Return a static mock — the lesson focuses on the guard mechanism, not real data.
        return {
            message: "Chào mừng Admin vào khu vực mật!",
            stats: {
                users: 100,
                orders: 15,
            },
        }
    }

    /**
     * Editor area — demonstrates multi-role OR: both ADMIN and EDITOR pass through.
     * USER / VIEWER tokens are rejected with 403.
     *
     * @returns Mock articles list payload
     */
    @Roles(Role.ADMIN,  // ADMIN is also allowed — OR semantics: any matching role passes
        Role.EDITOR)    // EDITOR is the primary audience for this route
    @Get("editor/articles")
    getEditorArticles(): { message: string; articles: Array<{ id: number; title: string }> } {
        // Static mock articles — real implementation would query a DB.
        return {
            message: "Editor area — admin and editor can both access this.",
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
     * Public liveness probe — @Public() sets IS_PUBLIC_KEY metadata so JwtAuthGuard
     * short-circuits before Passport, allowing requests without any Authorization header.
     *
     * @returns Simple `{ status: "ok" }` liveness payload
     */
    @Public() // IS_PUBLIC_KEY metadata causes JwtAuthGuard to skip verification entirely
    @Get("public/health")
    getPublicHealth(): { status: string } {
        return {
            status: "ok",
        }
    }
}
