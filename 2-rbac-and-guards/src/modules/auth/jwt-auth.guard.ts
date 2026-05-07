/**
 * Guard bao ve route — jwt-auth.guard.
 * (EN: Route guard — jwt-auth.guard.)
 */
import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/** AuthN boundary â€” phải chạy **trước** RolesGuard để có `req.user.role`. (EN: JWT authentication guard.) */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
