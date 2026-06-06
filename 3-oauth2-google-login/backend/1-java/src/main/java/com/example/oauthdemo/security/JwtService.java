package com.example.oauthdemo.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Helper service that signs internal HMAC-SHA256 JWTs.
 *
 * <p>The token carries only the {@code sub} (user id) claim — all other user data
 * is fetched fresh from the database on each authenticated request, which avoids
 * stale-claim problems (e.g., email changes not reflected in an old token).
 *
 * <p>The signing secret is injected from {@code jwt.secret} in {@code application.properties}
 * so it never appears in source code.
 */
@Service
public class JwtService {
    /** HMAC-SHA256 key derived from the configured secret string. */
    private final SecretKey key;

    /**
     * Derives the signing key from the secret string at construction time.
     * Deriving once and reusing avoids repeated key-derivation overhead per request.
     *
     * @param secret raw secret string from {@code application.properties} (jwt.secret).
     *               Must be at least 32 bytes to satisfy HMAC-SHA256 key-length requirements.
     */
    public JwtService(@Value("${jwt.secret}") String secret) {
        // Convert the raw UTF-8 secret bytes into a typed SecretKey — jjwt requires this type.
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generates a signed JWT with the given user id as the {@code sub} claim.
     *
     * <p>The token expires after one hour — short enough to limit the blast radius of
     * a leaked token while long enough for a typical browser session.
     *
     * @param userId the local user row's primary key; becomes the JWT {@code sub} claim.
     * @return compact, URL-safe JWT string in the format {@code header.payload.signature}.
     */
    public String generateToken(Long userId) {
        return Jwts.builder()
                .subject(String.valueOf(userId)) // only sub in payload — minimal token size
                .issuedAt(new Date())            // iat claim for token age tracking
                .expiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60)) // exp = now + 1 hour
                .signWith(key)                   // HMAC-SHA256 signature using the derived key
                .compact();
    }
}
