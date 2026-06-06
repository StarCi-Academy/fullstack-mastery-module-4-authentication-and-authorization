package com.example.refreshdemo.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Low-level JWT utility service: signs and validates access and refresh tokens.
 *
 * <p>Two separate {@link SecretKey} instances are created at construction time —
 * one for access tokens ({@code jwt.secret}) and one for refresh tokens
 * ({@code jwt.refreshSecret}). Using different keys prevents an AT from being
 * accepted as an RT and vice-versa.</p>
 *
 * <p>Token lifetimes match the lesson contract:
 * <ul>
 *   <li>Access token — 15 minutes</li>
 *   <li>Refresh token — 7 days</li>
 * </ul>
 * </p>
 */
@Service
public class JwtService {

    /** HMAC-SHA key derived from the access-token secret property. */
    private final SecretKey accessKey;

    /** HMAC-SHA key derived from the refresh-token secret property — distinct from accessKey. */
    private final SecretKey refreshKey;

    /**
     * Builds HMAC keys from the configured secret strings.
     * Both keys are created eagerly so startup fails fast if the properties are missing.
     *
     * @param secret        value of {@code jwt.secret} (access-token signing key)
     * @param refreshSecret value of {@code jwt.refreshSecret} (refresh-token signing key)
     */
    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.refreshSecret}") String refreshSecret) {
        // Convert UTF-8 byte arrays to HMAC-SHA SecretKey objects (jjwt Keys helper).
        this.accessKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(refreshSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Issues a short-lived access token for the given user.
     *
     * @param userId the user's database id to embed as the JWT subject
     * @return signed compact JWT string (expires in 15 minutes)
     */
    public String generateAccessToken(Long userId) {
        return Jwts.builder()
                .subject(String.valueOf(userId)) // sub claim carries the user id
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 1000 * 60 * 15)) // 15 minutes in ms
                .signWith(accessKey) // signed with AT secret — cannot be verified with RT secret
                .compact();
    }

    /**
     * Issues a long-lived refresh token for the given user.
     *
     * @param userId the user's database id to embed as the JWT subject
     * @return signed compact JWT string (expires in 7 days)
     */
    public String generateRefreshToken(Long userId) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 1000L * 60 * 60 * 24 * 7)) // 7 days in ms
                .signWith(refreshKey) // signed with RT secret — separate from AT secret
                .compact();
    }

    /**
     * Extracts the subject (user id string) from a verified access token.
     * Throws a {@link JwtException} if the token is invalid or expired.
     *
     * @param token compact JWT access token string
     * @return user id as a String (stored as JWT subject)
     */
    public String getUserIdFromAccessToken(String token) {
        return Jwts.parser()
                .verifyWith(accessKey) // signature verification happens here
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject(); // returns the "sub" claim value
    }

    /**
     * Extracts the subject (user id string) from a verified refresh token.
     *
     * @param token compact JWT refresh token string
     * @return user id as a String
     */
    public String getUserIdFromRefreshToken(String token) {
        return Jwts.parser()
                .verifyWith(refreshKey) // validates against RT secret only
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    /**
     * Checks whether an access token has a valid signature and has not expired.
     * Used by {@link JwtAuthenticationFilter} to protect secured endpoints.
     *
     * @param token compact JWT string from the Authorization header
     * @return true if valid; false if expired, malformed, or tampered
     */
    public boolean validateAccessToken(String token) {
        try {
            // parseSignedClaims validates both signature and expiry atomically.
            Jwts.parser().verifyWith(accessKey).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Any JWT problem (expired, bad signature, malformed) returns false.
            return false;
        }
    }

    /**
     * Checks whether a refresh token has a valid signature and has not expired.
     * Used by {@link com.example.refreshdemo.service.AuthService#refreshTokens} before
     * performing the bcrypt hash comparison.
     *
     * @param token compact JWT refresh token string
     * @return true if valid; false if expired, malformed, or tampered
     */
    public boolean validateRefreshToken(String token) {
        try {
            Jwts.parser().verifyWith(refreshKey).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
