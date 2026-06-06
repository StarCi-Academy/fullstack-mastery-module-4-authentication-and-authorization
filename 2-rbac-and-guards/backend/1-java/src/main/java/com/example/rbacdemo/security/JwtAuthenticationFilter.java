package com.example.rbacdemo.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Servlet filter that runs exactly once per request (OncePerRequestFilter).
 * Extracts the JWT from the Authorization header, validates it, and
 * populates the Spring SecurityContext so downstream guards can read the role.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;

    /**
     * @param jwtService service responsible for token validation and claim extraction
     */
    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    /**
     * Core filter logic — extracts and validates the Bearer token, then sets the
     * SecurityContext authentication so Spring Security's authorization rules apply.
     *
     * @param request     the incoming HTTP request
     * @param response    the HTTP response (passed through unchanged)
     * @param filterChain the remaining filter chain to invoke after this filter
     * @throws ServletException propagated from the filter chain
     * @throws IOException      propagated from the filter chain
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        // No Authorization header or not a Bearer token — pass through without authentication.
        // Spring Security will apply its own rules (e.g., deny protected routes with 401).
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Strip the "Bearer " prefix (7 chars) to get the raw JWT string.
        String token = authHeader.substring(7);

        if (jwtService.validateToken(token)) {
            Claims claims = jwtService.getClaimsFromToken(token);
            String userId = claims.getSubject();       // "sub" claim = user ID
            String role = claims.get("role", String.class); // custom "role" claim

            // Spring Security requires authority strings in "ROLE_<NAME>" format
            // so hasRole("ADMIN") matches "ROLE_ADMIN" internally.
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userId, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())));

            // Attach request metadata (IP, session) for audit/logging purposes.
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            // Place the authentication into the SecurityContext so authorization rules downstream can read it.
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        // Continue the filter chain regardless of token validity.
        // If validation failed, SecurityContext remains unauthenticated → Spring denies protected routes.
        filterChain.doFilter(request, response);
    }
}
