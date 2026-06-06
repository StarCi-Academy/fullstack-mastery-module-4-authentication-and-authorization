package com.example.jwtdemo.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Handles JWT token generation and validation using the JJWT library.
 *
 * <p>Tokens are signed with HMAC-SHA (derived from the configured secret).
 * The payload carries only the user id as the {@code sub} (subject) claim —
 * no session or database lookup is needed to verify identity on subsequent requests.
 */
@Service
public class JwtService {

    /**
     * HMAC key derived from the configured JWT secret.
     * Built once at construction time for efficiency; reused for all sign/verify operations.
     */
    private final SecretKey key;

    /**
     * Derives the HMAC signing key from the application property {@code jwt.secret}.
     *
     * @param secret raw secret string from {@code application.properties}
     */
    public JwtService(@Value("${jwt.secret}") String secret) {
        // Convert the raw string to a cryptographic key — JJWT validates minimum key length
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generates a signed JWT carrying the user id as the {@code sub} claim.
     *
     * @param userId numeric user id to embed in the token payload
     * @return compact, URL-safe JWT string (three Base64-encoded parts separated by dots)
     */
    public String generateToken(Long userId) {
        return Jwts.builder()
                .subject(String.valueOf(userId))   // `sub` claim = the only identity info in the token
                .issuedAt(new Date())              // `iat` claim records when the token was created
                .expiration(new Date(System.currentTimeMillis() + 1000L * 60 * 60)) // 1-hour validity
                .signWith(key)                     // HMAC signature — any modification will fail verification
                .compact();
    }

    /**
     * Extracts the user id from a verified token's {@code sub} claim.
     * Throws if the token is invalid or expired (caught by the caller).
     *
     * @param token compact JWT string from the {@code Authorization: Bearer} header
     * @return the string representation of the user id
     */
    public String getUserIdFromToken(String token) {
        return Jwts.parser()
                .verifyWith(key)        // Verify the HMAC signature against the same key
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();          // Return the `sub` claim that was set at sign time
    }

    /**
     * Returns {@code true} if the token signature and expiry are valid; {@code false} otherwise.
     * Catching {@link JwtException} covers all JJWT parse errors (expired, malformed, wrong key).
     *
     * @param token compact JWT string to validate
     * @return {@code true} when the token passes all checks; {@code false} on any failure
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token); // Throws on invalid signature, expiry, or format
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Any parse failure (expired, tampered payload, wrong key) → treat as invalid
            return false;
        }
    }
}
