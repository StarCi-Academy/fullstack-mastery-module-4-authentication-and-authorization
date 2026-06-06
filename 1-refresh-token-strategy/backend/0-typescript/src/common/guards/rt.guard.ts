/**
 * Guard that protects the /auth/refresh endpoint.
 * Delegates verification to RtStrategy ("jwt-refresh" Passport name).
 * Requires a valid REFRESH token in the Authorization header; attaches
 * `req.user = { sub, refreshToken }` for downstream AuthService.refreshTokens.
 */
import {
    Injectable,
} from "@nestjs/common"
import {
    AuthGuard,
} from "@nestjs/passport"

/**
 * Thin wrapper around Passport's "jwt-refresh" strategy.
 * Using a dedicated guard name prevents accidental access-token acceptance
 * on the refresh endpoint (each strategy validates against a different secret).
 */
@Injectable()
export class RtGuard extends AuthGuard("jwt-refresh") {}
