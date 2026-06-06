package com.example.oauthdemo.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security configuration for the OAuth2 demo.
 *
 * <p>This demo uses a stateless JWT strategy, so Spring Security's session management
 * and default CSRF protection are both disabled — they are designed for session-cookie
 * flows and would interfere with the token-based approach used here.
 *
 * <p>All endpoints are permitted without authentication so learners can call them
 * directly with curl or a browser without needing a pre-issued token.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Defines the HTTP security filter chain applied to every incoming request.
     *
     * <p>Key decisions:
     * <ul>
     *   <li>CSRF disabled — not needed for stateless REST APIs that use JWT, not cookies.</li>
     *   <li>CORS disabled — demo runs on localhost; enable and configure origins for production.</li>
     *   <li>Session policy STATELESS — no {@code HttpSession} is created; JWT carries all auth state.</li>
     *   <li>All requests permitted — demo focus is the OAuth flow itself, not endpoint authorization.</li>
     * </ul>
     *
     * @param http Spring Security's HTTP builder provided by the framework.
     * @return the assembled {@link SecurityFilterChain} registered as a Spring bean.
     * @throws Exception if the security configuration is invalid.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF — stateless JWT API does not rely on browser session cookies.
            .csrf(AbstractHttpConfigurer::disable)
            // Disable CORS — demo only; configure allowed origins for production deployments.
            .cors(AbstractHttpConfigurer::disable)
            // Force stateless sessions — Spring will never create or read an HttpSession.
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Permit all requests — authorization is handled by the JWT layer, not Spring Security.
            .authorizeHttpRequests(authorize -> authorize
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
