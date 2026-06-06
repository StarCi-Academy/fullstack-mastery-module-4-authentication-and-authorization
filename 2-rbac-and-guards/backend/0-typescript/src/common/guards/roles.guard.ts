/**
 * Route guard — roles.guard.
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
 * Authorization guard comparing JWT role vs endpoint metadata.
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    /**
     * Determines if the incoming request is allowed to proceed based on RBAC metadata.
     * Called after JwtAuthGuard so `req.user` is already populated with the decoded token.
     *
     * @param context — Nest execution context providing access to the request and handler metadata
     * @returns true when no roles are required OR the token role is in the allowed set
     * @throws ForbiddenException (403) when the user is authenticated but lacks the required role
     */
    canActivate(context: ExecutionContext): boolean {
        // getAllAndOverride: handler-level metadata wins over class-level metadata.
        // This lets individual route methods tighten or relax class-wide restrictions.
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY,
            [
                context.getHandler(), // method decorator checked first
                context.getClass(),   // class decorator as fallback
            ])

        // No @Roles() metadata present — route is open to any authenticated user (AuthN-only).
        if (!requiredRoles?.length) {
            return true
        }

        // JwtAuthGuard attaches the decoded JWT payload to req.user before this guard runs.
        const req = context.switchToHttp().getRequest<{ user?: { userId: number; role: Role } }>()
        const role = req.user?.role

        // If role is missing or not in the required set, throw 403 (not 401 — token was valid).
        // 401 = unauthenticated; 403 = authenticated but unauthorised — semantically different.
        if (!role || !requiredRoles.includes(role)) {
            throw new ForbiddenException("Forbidden resource")
        }
        return true
    }
}
