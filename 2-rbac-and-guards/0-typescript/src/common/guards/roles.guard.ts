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
     * @param context — Nest execution context
     * @returns true allows when metadata absent or role matches
     * @throws ForbiddenException — 403 when authenticated but unauthorized
     */
    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ])
        // open to any authenticated user
        if (!requiredRoles?.length) {
            return true
        }

        const req = context.switchToHttp().getRequest<{ user?: { userId: number; role: Role } }>()
        const role = req.user?.role
        // distinguish AuthZ vs AuthN
        if (!role || !requiredRoles.includes(role)) {
            throw new ForbiddenException("Forbidden resource")
        }
        return true
    }
}
