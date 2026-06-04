/**
 * Route guard — jwt-auth.guard.
 */
import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/**
 * Activates registered Passport JWT strategy before controller handlers.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
