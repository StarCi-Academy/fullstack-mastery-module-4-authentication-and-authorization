package com.example.jwtdemo.security;

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
 * Servlet filter that extracts and validates the JWT Bearer token on every request.
 *
 * <p>Extends {@link OncePerRequestFilter} to guarantee execution exactly once per
 * HTTP request even in forwarded/included scenarios.
 *
 * <p>Flow:
 * <ol>
 *   <li>Read the {@code Authorization: Bearer <token>} header.</li>
 *   <li>Validate the JWT signature and expiry via {@link JwtService}.</li>
 *   <li>On success, populate the Spring {@link SecurityContextHolder} so that
 *       {@code @PreAuthorize} and route-level rules can see the authenticated principal.</li>
 *   <li>Always delegate to the next filter — authentication failures leave the context
 *       empty, which Spring Security will handle as a 401.</li>
 * </ol>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** JWT utility for signature validation and claim extraction. */
    private final JwtService jwtService;

    /**
     * Constructs the filter with the JWT service via constructor injection.
     *
     * @param jwtService service that validates tokens and extracts claims
     */
    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    /**
     * Core filter logic — validate the Bearer token and populate the security context.
     *
     * @param request     incoming HTTP request
     * @param response    HTTP response (not modified by this filter)
     * @param filterChain remaining filter chain to invoke after processing
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Skip authentication entirely when no Authorization header is present
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // Continue without setting a principal — Spring Security will reject if the route requires auth
            filterChain.doFilter(request, response);
            return;
        }

        // Strip the "Bearer " prefix (7 characters) to obtain the raw JWT string
        String token = authHeader.substring(7);

        if (jwtService.validateToken(token)) {
            // Token is valid — extract the user id from the `sub` claim
            String userId = jwtService.getUserIdFromToken(token);

            // Build a Spring Security authentication token with no credentials/authorities
            // (RBAC / authorities are out of scope for this lesson — JWT auth only)
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId, null, Collections.emptyList());

            // Attach request-level metadata (IP, session id) to the authentication object
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            // Publish the authentication to the current request thread's security context
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        // If validateToken returned false, the context stays empty → Spring Security returns 401

        // Always continue the chain — the security config decides the final response
        filterChain.doFilter(request, response);
    }
}
