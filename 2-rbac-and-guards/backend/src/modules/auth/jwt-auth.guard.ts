/**
 * Guard bao vệ route — jwt-auth.guard.
 * (EN: Route guard — jwt-auth.guard.)
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
 * AuthN boundary — phải chạy **trước** RolesGuard để có `req.user.role`.
 * Honor `@Public()` để cho phép bỏ qua xác thực ở các route công khai.
 * (EN: JWT authentication guard; honors @Public() to skip auth for marked routes.)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    constructor(private readonly reflector: Reflector) {
        super()
    }

    /**
     * Override canActivate để bypass khi route đánh dấu `@Public()`.
     * (EN: Override canActivate to allow public routes through without JWT verification.)
     *
     * @param context — Nest execution context (EN: Nest execution context).
     * @returns true ngay nếu route public; ngược lại uỷ quyền cho AuthGuard("jwt") (EN: public bypass or default JWT).
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
