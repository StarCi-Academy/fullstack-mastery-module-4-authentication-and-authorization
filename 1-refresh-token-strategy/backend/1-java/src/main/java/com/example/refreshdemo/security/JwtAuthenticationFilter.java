package com.example.refreshdemo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Servlet filter that runs once per request to validate the access JWT and
 * populate the Spring Security {@link SecurityContextHolder}.
 *
 * <p>Flow:
 * <ol>
 *   <li>Read the "Authorization: Bearer &lt;token&gt;" header.</li>
 *   <li>If absent or malformed, skip authentication (public endpoints proceed; secured ones
 *       will be rejected by Spring Security's authorization rules).</li>
 *   <li>Validate the token signature and expiry via {@link JwtService#validateAccessToken}.</li>
 *   <li>On success, create an {@link UsernamePasswordAuthenticationToken} with the user id as
 *       the principal and set it on the {@link SecurityContextHolder}.</li>
 * </ol>
 * </p>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** JWT utility for validation and claim extraction. */
    private final JwtService jwtService;

    /**
     * @param jwtService injected JWT utility bean
     */
    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    /**
     * Intercepts each HTTP request exactly once.
     * Sets an authentication object in the SecurityContext when a valid AT is present.
     *
     * @param request     incoming HTTP request
     * @param response    HTTP response (not modified here)
     * @param filterChain remaining filter chain to invoke after this filter
     * @throws ServletException if a servlet error occurs
     * @throws IOException      if an I/O error occurs during filtering
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        // Skip filter if no Bearer token is present — Spring Security handles authorization later.
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Strip the "Bearer " prefix (7 characters) to get the raw JWT string.
        String token = authHeader.substring(7);

        if (jwtService.validateAccessToken(token)) {
            // Token is valid — extract the user id from the "sub" claim.
            String userId = jwtService.getUserIdFromAccessToken(token);

            // Construct an Authentication object with the user id as principal.
            // Credentials are null (we don't need the password here).
            // Empty authorities — role-based access is out of scope for this lesson.
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId, null, Collections.emptyList());

            // Attach request details (remote IP, session id) for audit/logging purposes.
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            // Store authentication in the SecurityContext so downstream handlers
            // can read the authenticated principal via SecurityContextHolder.
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        // If token is invalid, SecurityContext remains unauthenticated and Spring Security
        // will reject access to protected endpoints at the authorization layer.

        filterChain.doFilter(request, response);
    }
}
