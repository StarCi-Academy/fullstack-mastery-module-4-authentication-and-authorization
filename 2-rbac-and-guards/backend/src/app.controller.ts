import {
    Controller,
    Get,
} from "@nestjs/common"

/**
 * Trang chủ học phần — metadata breadcrumb + flow kiểm thử AuthN/AuthZ (JSON tĩnh cho LMS).
 * (EN: Lesson homepage JSON: breadcrumb trail and RBAC curl flow summary.)
 */
@Controller()
export class AppController {
    @Get()
    getHome() {
        return {
            breadcrumb: [
                "Trang chủ",
                "Khóa học",
                "Fullstack Mastery",
                "Học phần",
                "Phân quyền theo vai trò (RBAC) và Guards",
            ],
            lesson: {
                title: "Phân quyền theo vai trò (RBAC) và Guards",
                title_en: "RBAC and Guards",
                subtitle:
                    "Xây dựng hệ thống phân quyền RBAC đa tầng trên NestJS với custom Decorator và RolesGuard, phân biệt rõ Authentication và Authorization trong request pipeline.",
                reading_minutes: 20,
                lectures: 0,
                challenges: 1,
            },
            authn_vs_authz: {
                authentication: {
                    vi: "Xác thực — JwtAuthGuard (token hợp lệ → gắn req.user).",
                    en: "Authentication — JwtAuthGuard verifies token and attaches req.user.",
                },
                authorization: {
                    vi: "Phân quyền — RolesGuard đọc @Roles(), so với req.user.role.",
                    en: "Authorization — RolesGuard compares @Roles() metadata to JWT role.",
                },
                guard_chain_order: ["JwtAuthGuard",
                    "RolesGuard"],
            },
            api_surface: {
                signup: "POST /auth/signup",
                signin: "POST /auth/signin",
                admin_dashboard: "GET /admin/dashboard",
            },
            verification_flows: [
                {
                    id: "admin_dashboard_ok",
                    vi: "Admin có token → GET /admin/dashboard → 200.",
                    en: "Admin bearer token → GET /admin/dashboard → 200.",
                },
                {
                    id: "user_forbidden",
                    vi: "User thường có token → GET /admin/dashboard → 403 Forbidden.",
                    en: "Regular user bearer token → GET /admin/dashboard → 403.",
                },
                {
                    id: "no_token_unauthorized",
                    vi: "Không Authorization header → GET /admin/dashboard → 401 Unauthorized.",
                    en: "No Authorization header → GET /admin/dashboard → 401.",
                },
            ],
            setup_hint: {
                vi: "Trước luồng 1: POST /auth/signup với role \"admin\" (vd. admin@test.com / 123456), sau đó POST /auth/signin.",
                en: "Before flow 1: POST /auth/signup with role \"admin\", then POST /auth/signin.",
            },
        }
    }
}
