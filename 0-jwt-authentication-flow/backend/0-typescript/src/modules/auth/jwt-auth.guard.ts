/**
 * Route guard — jwt-auth.guard.
 * Wires the "jwt" Passport strategy as a NestJS guard.
 */
import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/**
 * Activates the registered Passport "jwt" strategy before controller handlers.
 *
 * Usage: `@UseGuards(JwtAuthGuard)` on a route or controller class.
 * When placed on a handler, Passport intercepts the request, runs `JwtStrategy`,
 * and either:
 *  - Calls `validate()` and attaches the result to `req.user`, then proceeds.
 *  - Returns HTTP 401 Unauthorized if the token is missing, invalid, or expired.
 *
 * Because this extends `AuthGuard("jwt")`, there is no logic to write here —
 * the behaviour is fully provided by the Passport integration.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
