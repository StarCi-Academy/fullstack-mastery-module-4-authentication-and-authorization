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

/** Guard JWT access â€” dùng cho `/auth/logout` trong demo nÃ y. (EN: Bearer access JWT guard.) */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
