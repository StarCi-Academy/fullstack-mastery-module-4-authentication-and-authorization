/**
 * Route guard — jwt-auth.guard.
 */
import {
    ExecutionContext,
    Injectable,
} from "@nestjs/common"
import {
    Reflector,
} from "@nestjs/core"
import {
    AuthGuard,
} from "@nestjs/passport"
import {
    IS_PUBLIC_KEY,
} from "../../common/decorators"

/**
 * AuthN boundary — must run **before** RolesGuard to get `req.user.role`.
 * JWT authentication guard; honors @Public() to skip auth for marked routes.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    constructor(private readonly reflector: Reflector) {
        super()
    }

    /**
     * Override canActivate to allow public routes through without JWT verification.
     *
     * @param context — Nest execution context
     * @returns true public bypass or default JWT
     */
    canActivate(context: ExecutionContext): boolean | Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ])
        if (isPublic) {
            return true
        }
        return super.canActivate(context) as boolean | Promise<boolean>
    }
}
