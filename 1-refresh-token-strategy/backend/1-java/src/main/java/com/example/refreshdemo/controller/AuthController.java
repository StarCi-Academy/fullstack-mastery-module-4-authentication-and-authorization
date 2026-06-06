package com.example.refreshdemo.controller;

import com.example.refreshdemo.dto.SignInRequest;
import com.example.refreshdemo.dto.SignUpRequest;
import com.example.refreshdemo.dto.SignUpResponse;
import com.example.refreshdemo.dto.TokenResponse;
import com.example.refreshdemo.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller exposing the four auth endpoints for the refresh-token strategy lesson.
 * The controller is intentionally thin — all business logic lives in {@link AuthService}.
 *
 * <ul>
 *   <li>POST /auth/signup   — register; returns {@link SignUpResponse}</li>
 *   <li>POST /auth/signin   — authenticate; returns {@link TokenResponse}</li>
 *   <li>POST /auth/refresh  — rotate tokens (RT in Authorization: Bearer header)</li>
 *   <li>POST /auth/logout   — revoke RT (AT required; principal set by JwtAuthenticationFilter)</li>
 * </ul>
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    /** Delegates all business logic (hashing, DB writes, token issuance). */
    private final AuthService authService;

    /**
     * @param authService injected auth service bean
     */
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Registers a new user with a BCrypt-hashed password.
     * Returns HTTP 201 with {@link SignUpResponse} containing id + email.
     * Returns HTTP 409 when the email is already registered.
     *
     * @param request validated signup payload (email + plaintext password)
     * @return new user's public profile (id and email)
     */
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED) // explicit 201 to match the lesson contract
    public SignUpResponse signUp(@Valid @RequestBody SignUpRequest request) {
        return authService.signUp(request);
    }

    /**
     * Authenticates credentials and issues a new AT + RT pair.
     * Returns HTTP 200 with {@link TokenResponse} containing both token strings.
     * Returns HTTP 401 when credentials are invalid.
     *
     * @param request validated signin payload (email + plaintext password)
     * @return token pair with access and refresh tokens
     */
    @PostMapping("/signin")
    public TokenResponse signIn(@Valid @RequestBody SignInRequest request) {
        return authService.signIn(request);
    }

    /**
     * Rotates the token pair given a valid refresh token in the Authorization header.
     * Two-step verification occurs in {@link AuthService#refreshTokens}: JWT signature/expiry,
     * then BCrypt hash comparison against the stored hash.
     * Returns HTTP 200 with a fresh {@link TokenResponse}.
     * Returns HTTP 401 when the token is expired, revoked, or the hash mismatches.
     *
     * @param request HTTP request (Authorization: Bearer header is read manually)
     * @return {@link ResponseEntity} containing a new token pair or a 401 error body
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request) {
        // Extract the raw RT string from the Authorization: Bearer header.
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Refresh token revoked or rotated", "Unauthorized");
        }
        String refreshToken = authHeader.substring(7); // strip "Bearer " prefix (7 chars)
        try {
            TokenResponse tokens = authService.refreshTokens(refreshToken);
            return ResponseEntity.ok(tokens);
        } catch (ResponseStatusException e) {
            // Re-map the service exception to the lesson-spec JSON error body.
            return buildErrorResponse(HttpStatus.valueOf(e.getStatusCode().value()), e.getReason(), "Unauthorized");
        }
    }

    /**
     * Revokes the active refresh token by setting its BCrypt hash to null in the DB.
     * The access token is validated upstream by {@code JwtAuthenticationFilter};
     * the user id is read from the Spring Security {@code SecurityContext}.
     * Returns HTTP 200 with {@code { "message": "Logged out" }}.
     * Returns HTTP 401 when the principal is missing or anonymous.
     *
     * @return {@link ResponseEntity} with logout confirmation or 401 error
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // The AT was already validated by JwtAuthenticationFilter; read the authenticated principal.
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal == null || "anonymousUser".equals(principal)) {
            // Should not happen if SecurityConfig is correct, but guard defensively.
            return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Unauthorized", "Unauthorized");
        }
        // Principal is stored as String (user id) by JwtAuthenticationFilter.
        Long userId = Long.valueOf((String) principal);
        authService.logout(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out");
        return ResponseEntity.ok(response);
    }

    /**
     * Builds a JSON error response body that matches the lesson HTTP contract:
     * {@code { "statusCode": <N>, "message": "...", "error": "..." }}.
     *
     * @param status  HTTP status code to set on the response
     * @param message human-readable error description
     * @param error   error category string (e.g. "Unauthorized")
     * @return {@link ResponseEntity} with the error body and the given status
     */
    private ResponseEntity<?> buildErrorResponse(HttpStatus status, String message, String error) {
        Map<String, Object> body = new HashMap<>();
        body.put("statusCode", status.value());
        body.put("message", message);
        body.put("error", error);
        return ResponseEntity.status(status).body(body);
    }
}
