/**
 * Route guard — jwt-auth.guard.
 */
import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/** Bearer access JWT guard. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
