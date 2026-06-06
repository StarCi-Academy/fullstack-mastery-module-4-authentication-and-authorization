package com.example.oauthdemo.controller;

import com.example.oauthdemo.entity.User;
import com.example.oauthdemo.service.AuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

/**
 * REST controller for the OAuth2 Google login flow.
 *
 * <p>Exposes two endpoints that together implement the authorization-code dance:
 * <ol>
 *   <li>{@code GET /auth/google} — redirects the browser to Google's consent screen.</li>
 *   <li>{@code GET /auth/google/callback} — receives the authorization code, upserts the
 *       local user, signs an internal JWT, and returns the token as JSON.</li>
 * </ol>
 *
 * <p>A mock branch is active when the code query parameter equals {@code "mockcode"} so the
 * full flow can be exercised offline without a real Google OAuth application.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {
    /** Handles user upsert and JWT issuance — all persistence logic lives here, not in the controller. */
    private final AuthService authService;

    /**
     * Constructs the controller with a required {@link AuthService} dependency.
     *
     * @param authService service responsible for finding/creating users and signing JWTs.
     */
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Initiates the OAuth2 authorization-code flow by redirecting the browser to Google.
     *
     * <p>The redirect URL includes {@code client_id}, {@code scope}, and {@code redirect_uri}.
     * In a real deployment {@code client_id} must be a value registered in Google Cloud Console.
     * Here it is set to {@code "dummy"} because the mock callback branch handles offline testing.
     *
     * @return HTTP 302 response with a {@code Location} header pointing to Google's auth endpoint.
     */
    @GetMapping("/google")
    public ResponseEntity<Void> googleRedirect() {
        // Build the authorization URL manually — Spring Security OAuth2 client would normally do
        // this automatically, but this demo uses a lightweight manual approach for clarity.
        String googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                "response_type=code&" +
                // Redirect URI must exactly match the Authorized Redirect URI in Google Cloud Console.
                "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback&" +
                // Minimal scopes: email for the upsert key, profile for display name.
                "scope=email%20profile&" +
                // Placeholder client_id — replace with a real registered ID for live deployments.
                "client_id=dummy";

        // Return a Found (302) redirect — the browser follows this automatically.
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(googleAuthUrl))
                .build();
    }

    /**
     * Receives the OAuth authorization code from Google (or a mock code for offline testing),
     * upserts the local user row, signs an internal JWT, and returns the token as JSON.
     *
     * <p>Two branches:
     * <ul>
     *   <li><b>Mock</b> ({@code code == "mockcode"}): uses a fixed profile so tests/demos can run
     *       without a real Google app configured.</li>
     *   <li><b>Real</b> (all other values): returns 401 in this demo because the full Spring
     *       Security OAuth2 client integration is not wired — learners should plug in
     *       {@code spring-security-oauth2-client} for production use.</li>
     * </ul>
     *
     * @param code the authorization code forwarded by Google, or {@code "mockcode"} for mock tests.
     * @return HTTP 200 with {@code access_token}, {@code isNewUser}, and user summary on success;
     *         HTTP 401 when the code is not the mock value.
     */
    @GetMapping("/google/callback")
    public ResponseEntity<?> googleCallback(@RequestParam(value = "code", required = false) String code) {
        // Mock branch: bypass live Google token exchange for offline testing.
        // Uses fixed profile values to keep the upsert logic deterministic across test runs.
        if ("mockcode".equals(code)) {
            Map<String, Object> result = authService.findOrCreateGoogleUser(
                    "mock-google-sub-123", // stable googleId used as the primary upsert key
                    "mock@demo.com",        // email used as the fallback upsert key
                    "Mock",
                    "User",
                    null                    // no profile picture in mock mode
            );
            // Cast is safe: findOrCreateGoogleUser always puts a User instance under "user".
            User user = (User) result.get("user");
            boolean isNewUser = (boolean) result.get("isNewUser");

            // Sign JWT and build the JSON response — same shape as the real flow.
            Map<String, Object> response = authService.completeGoogleLogin(user, isNewUser);
            return ResponseEntity.ok(response);
        }

        // Real-code path: not implemented in this demo — reject to avoid silent misuse.
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("statusCode", 401, "message", "Google authentication failed"));
    }
}
