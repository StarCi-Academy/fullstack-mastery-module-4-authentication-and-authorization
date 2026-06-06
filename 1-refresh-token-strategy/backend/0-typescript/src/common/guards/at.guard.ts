/**
 * Guard that protects endpoints requiring a valid ACCESS token.
 * Delegates verification to AtStrategy ("jwt" Passport name).
 * Attach with `@UseGuards(AtGuard)` on controller methods that must be authenticated.
 */
import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/**
 * Thin wrapper around Passport's "jwt" strategy.
 * Extending AuthGuard wires the strategy and throws UnauthorizedException automatically
 * when the token is missing, invalid, or expired.
 */
@Injectable()
export class AtGuard extends AuthGuard("jwt") {}
