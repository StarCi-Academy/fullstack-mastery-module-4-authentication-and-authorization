package com.example.refreshdemo.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security configuration for the refresh-token demo.
 *
 * <p>Key decisions:
 * <ul>
 *   <li>CSRF disabled — the API is stateless (JWT, no session cookies), so CSRF does not apply.</li>
 *   <li>Sessions set to STATELESS — no HttpSession is created; every request is authenticated
 *       by its JWT alone.</li>
 *   <li>{@code /auth/**} endpoints are public — signup/signin/refresh/logout use their own guards.</li>
 *   <li>All other endpoints require authentication via the JWT filter.</li>
 * </ul>
 * </p>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /** Intercepts every request to validate and set the access-token authentication. */
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /** Returns RFC-compliant 401 JSON when an unauthenticated request hits a protected resource. */
    private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;

    /**
     * @param jwtAuthenticationFilter         JWT filter bean
     * @param customAuthenticationEntryPoint  401 error formatter bean
     */
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          CustomAuthenticationEntryPoint customAuthenticationEntryPoint) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.customAuthenticationEntryPoint = customAuthenticationEntryPoint;
    }

    /**
     * Exposes BCryptPasswordEncoder as a shared bean.
     * Cost factor defaults to 10 — consistent with the TS implementation.
     *
     * @return BCrypt encoder instance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configures the HTTP security filter chain.
     *
     * @param http Spring Security's HttpSecurity builder
     * @return built SecurityFilterChain
     * @throws Exception if configuration fails
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF protection is unnecessary for token-based APIs — disable to reduce friction.
            .csrf(AbstractHttpConfigurer::disable)
            // CORS is disabled for local demo; enable and configure for production.
            .cors(AbstractHttpConfigurer::disable)
            // Stateless: no session is created or used between requests.
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Custom entry point returns structured 401 JSON instead of Spring's default HTML error.
            .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(customAuthenticationEntryPoint))
            .authorizeHttpRequests(authorize -> authorize
                // Public: all /auth/* routes (signup, signin, refresh, logout) handle their own auth.
                .requestMatchers("/auth/**").permitAll()
                // All other routes require a valid access token.
                .anyRequest().authenticated()
            )
            // Insert the JWT filter before Spring's default username/password filter.
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
