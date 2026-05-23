/**
 * Guard bao ve route — roles.guard.
 * (EN: Route guard — roles.guard.)
 */
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common"
import {
    Reflector,
} from "@nestjs/core"
import {
    Role,
} from "../role.enum"
import {
    ROLES_KEY,
} from "../decorators/roles.decorator"

/**
 * Lớp AuthZ sau JwtAuthGuard — so khớp role trong JWT với `@Roles(...)`.
 * (EN: Authorization guard comparing JWT role vs endpoint metadata.)
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    /**
     * @param context — Nest execution context để đọc handler/class metadata + HTTP request (EN: Nest execution context).
     * @returns true khi không có `@Roles` hoặc role khớp (EN: allows when metadata absent or role matches).
     * @throws ForbiddenException — token hợp lệ nhưng không đủ quyá»n (EN: 403 when authenticated but unauthorized).
     */
    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ])
        // Không gắn @Roles â‡’ không ép buộc AuthZ (public authenticated route pattern) / EN: open to any authenticated user
        if (!requiredRoles?.length) {
            return true
        }

        const req = context.switchToHttp().getRequest<{ user?: { userId: number; role: Role } }>()
        const role = req.user?.role
        // JWT có thể hợp lệ nhưng claim role không thuộc requiredRoles â‡’ 403 rõ rÃ ng hơn 401 (EN: distinguish AuthZ vs AuthN)
        if (!role || !requiredRoles.includes(role)) {
            throw new ForbiddenException("Forbidden resource")
        }
        return true
    }
}
