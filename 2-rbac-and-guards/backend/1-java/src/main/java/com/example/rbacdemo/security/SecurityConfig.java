package com.example.rbacdemo.security;

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
 * Spring Security configuration for the RBAC demo.
 * Registers the JWT filter, sets up stateless sessions, and declares route authorization rules.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;

    /**
     * @param jwtAuthenticationFilter       filter that extracts and validates the JWT
     * @param customAuthenticationEntryPoint returns 401 JSON on missing/invalid token
     * @param customAccessDeniedHandler      returns 403 JSON on insufficient role
     */
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          CustomAuthenticationEntryPoint customAuthenticationEntryPoint,
                          CustomAccessDeniedHandler customAccessDeniedHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.customAuthenticationEntryPoint = customAuthenticationEntryPoint;
        this.customAccessDeniedHandler = customAccessDeniedHandler;
    }

    /**
     * BCrypt password encoder bean — shared by AuthService for hashing and comparison.
     *
     * @return BCryptPasswordEncoder with default cost factor (10)
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Defines the HTTP security filter chain with route-level RBAC rules.
     *
     * <p>Rule priority — Spring Security evaluates rules top-to-bottom; more specific paths first.</p>
     *
     * @param http the HttpSecurity builder
     * @return the configured SecurityFilterChain
     * @throws Exception if the configuration is invalid
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)   // REST API — CSRF protection not needed (no cookies for auth)
            .cors(AbstractHttpConfigurer::disable)   // CORS handled at the application level if needed
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // JWT = no server-side session
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(customAuthenticationEntryPoint) // 401 on missing/invalid token
                .accessDeniedHandler(customAccessDeniedHandler)           // 403 on insufficient role
            )
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/auth/**").permitAll()               // signup + signin — public
                .requestMatchers("/public/**").permitAll()             // health — public
                .requestMatchers("/admin/**").hasRole("ADMIN")         // single-role gate: ADMIN only
                .requestMatchers("/editor/**").hasAnyRole("ADMIN", "EDITOR") // multi-role OR gate
                .anyRequest().authenticated()                          // all other routes need a valid token
            )
            // Register JWT filter before the default username/password filter so the SecurityContext
            // is populated by the time authorization rules are evaluated.
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
