package com.example.rbacdemo.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Utility service for JWT creation and validation.
 * Uses HMAC-SHA256 (HS256) with a symmetric secret key loaded from application properties.
 * The role claim embedded in the token is later read by the JwtAuthenticationFilter
 * to populate Spring Security's granted authorities — avoiding a DB round-trip per request.
 */
@Service
public class JwtService {
    /** Derived HMAC key — built once at construction time from the configured secret bytes. */
    private final SecretKey key;

    /**
     * @param secret shared JWT secret injected from {@code jwt.secret} in application.properties
     */
    public JwtService(@Value("${jwt.secret}") String secret) {
        // Convert the UTF-8 secret string to an HMAC-compatible SecretKey for JJWT.
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Builds and signs a JWT embedding the user's ID and role.
     * The token is valid for 1 hour — adequate for a demo scenario.
     *
     * @param userId database primary key used as the JWT {@code sub} claim
     * @param role   plain role string (e.g. "admin") embedded as a custom claim
     * @return compact signed JWT string
     */
    public String generateToken(Long userId, String role) {
        return Jwts.builder()
                .subject(String.valueOf(userId))   // "sub" claim — standard JWT subject
                .claim("role", role)               // custom claim read by the filter for RBAC
                .issuedAt(new Date())              // "iat" — when the token was issued
                .expiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60)) // "exp" — 1 hour TTL
                .signWith(key)                     // signs with HS256 (default for SecretKey)
                .compact();
    }

    /**
     * Parses and returns all claims from a verified JWT.
     * Throws a JwtException if the signature is invalid or the token is expired.
     *
     * @param token compact JWT string from the Authorization header
     * @return {@link Claims} map containing "sub", "role", "iat", "exp"
     */
    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(key)        // verify HMAC signature using the shared secret key
                .build()
                .parseSignedClaims(token)
                .getPayload();          // discard the header; return only the claims body
    }

    /**
     * Validates the token signature and expiry without throwing.
     * Returns false for any JwtException (expired, tampered, malformed) or null input.
     *
     * @param token compact JWT string to validate
     * @return true if the token is structurally valid and not expired
     */
    public boolean validateToken(String token) {
        try {
            // This call verifies the HMAC signature and checks the "exp" claim automatically.
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Any validation failure — tampered signature, expired, malformed — returns false.
            return false;
        }
    }
}
