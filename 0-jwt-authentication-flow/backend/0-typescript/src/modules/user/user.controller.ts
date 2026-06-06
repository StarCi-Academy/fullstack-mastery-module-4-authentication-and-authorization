/**
 * REST controller for User feature.
 * Exposes protected routes that require a valid JWT Bearer token.
 */
import {
    Controller,
    Get,
    Request,
    UseGuards,
} from "@nestjs/common"
import {
    JwtAuthGuard,
} from "../auth/jwt-auth.guard"

/**
 * Sample protected user routes demonstrating JWT-based access control.
 * Any route decorated with `@UseGuards(JwtAuthGuard)` will reject requests
 * that lack a valid Bearer token with HTTP 401 before the handler runs.
 */
@Controller("users")
export class UserController {
    /**
     * Returns the authenticated user's id extracted from the JWT claim.
     * The `userId` comes from `req.user` which `JwtStrategy.validate()` populates —
     * no database query is made; identity is derived purely from the verified token.
     *
     * @param req - request object enriched by `JwtStrategy` with `{ user: { userId } }`
     * @returns confirmation message and the numeric user id from the JWT `sub` claim
     */
    @UseGuards(JwtAuthGuard) // Activate the JWT strategy — returns 401 for missing/invalid tokens
    @Get("profile")
    getProfile(@Request() req: { user: { userId: number } }) {
        return {
            // Confirm the route is accessible (useful for debugging auth flow)
            message: "You have accessed a protected resource!",
            user: {
                // userId is extracted from the JWT `sub` claim, not from the database
                userId: req.user.userId,
            },
        }
    }
}
