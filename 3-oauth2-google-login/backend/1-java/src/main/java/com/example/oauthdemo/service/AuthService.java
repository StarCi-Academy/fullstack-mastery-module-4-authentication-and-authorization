package com.example.oauthdemo.service;

import com.example.oauthdemo.entity.User;
import com.example.oauthdemo.repository.UserRepository;
import com.example.oauthdemo.security.JwtService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Business logic for the Google OAuth2 login flow.
 *
 * <p>Owns two responsibilities:
 * <ol>
 *   <li>Federated identity upsert — map a Google profile to a local {@link User} row.</li>
 *   <li>JWT issuance — sign an internal access token once the identity is confirmed.</li>
 * </ol>
 *
 * <p>Stateless service — no session or request-scoped state is held here.
 */
@Service
public class AuthService {
    /** Repository used to read and persist user rows. */
    private final UserRepository userRepository;
    /** Handles HMAC-SHA256 JWT signing. */
    private final JwtService jwtService;

    /**
     * Constructs the service with required dependencies injected by Spring.
     *
     * @param userRepository JPA repository for {@link User} persistence.
     * @param jwtService     helper that signs internal JWTs.
     */
    public AuthService(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    /**
     * Upserts a local user row linked to the provided Google identity.
     *
     * <p>Lookup strategy (two-stage):
     * <ol>
     *   <li>Search by {@code googleId} — the stable provider identifier for returning users.</li>
     *   <li>If not found, search by {@code email} — to silently link an existing local account with Google.</li>
     *   <li>If neither exists, INSERT a new row with {@code password = null} (OAuth-only account).</li>
     * </ol>
     *
     * @param googleId  stable Google subject identifier ({@code sub} claim); used as primary upsert key.
     * @param email     verified email address; used as fallback upsert key and stored on the row.
     * @param firstName user's given name from the Google profile; may be {@code null}.
     * @param lastName  user's family name from the Google profile; may be {@code null}.
     * @param picture   URL to the user's Google profile photo; may be {@code null}.
     * @return a {@link Map} containing {@code "user"} ({@link User}) and {@code "isNewUser"} ({@link Boolean}).
     */
    public Map<String, Object> findOrCreateGoogleUser(String googleId, String email, String firstName, String lastName, String picture) {
        // Stage 1: try stable googleId first — fastest path for returning users.
        Optional<User> userOpt = userRepository.findByGoogleId(googleId);
        if (userOpt.isEmpty()) {
            // Stage 2: fall back to email so a pre-existing password account can gain Google login.
            userOpt = userRepository.findByEmail(email);
        }

        User user;
        boolean isNewUser;
        if (userOpt.isEmpty()) {
            // First time we see this identity — INSERT a new OAuth-only user row.
            // password is null because the credential lives at Google, not in our database.
            user = new User();
            user.setEmail(email);
            user.setGoogleId(googleId);
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setPicture(picture);
            user.setPassword(null); // OAuth-only account: no local password
            user = userRepository.save(user);
            isNewUser = true;
        } else {
            // Returning user — re-link googleId (handles email-matched case where googleId was null).
            user = userOpt.get();
            user.setGoogleId(googleId); // always overwrite to guarantee the link is set
            // Only overwrite name/picture if Google provided a non-null value.
            if (firstName != null) user.setFirstName(firstName);
            if (lastName != null) user.setLastName(lastName);
            if (picture != null) user.setPicture(picture);
            user = userRepository.save(user);
            isNewUser = false;
        }

        // Wrap result in a map so the controller can extract user and isNewUser separately.
        Map<String, Object> result = new HashMap<>();
        result.put("user", user);
        result.put("isNewUser", isNewUser);
        return result;
    }

    /**
     * Signs an internal JWT and formats the final JSON response returned to the client.
     *
     * <p>The JWT carries only the {@code sub} (user id) claim — all other data is fetched
     * fresh from the database on each authenticated request, avoiding stale-claim issues.
     *
     * @param user      persisted user entity whose id becomes the JWT subject.
     * @param isNewUser {@code true} when the user row was just INSERTed; {@code false} on upsert.
     * @return map with keys {@code message}, {@code access_token}, {@code isNewUser}, and {@code user}.
     */
    public Map<String, Object> completeGoogleLogin(User user, boolean isNewUser) {
        // Sign JWT with only the user id — minimal payload reduces token size.
        String accessToken = jwtService.generateToken(user.getId());

        // Build the display name by joining non-empty first/last name parts.
        String name = Stream.of(user.getFirstName(), user.getLastName())
                .filter(s -> s != null && !s.isEmpty())
                .collect(Collectors.joining(" "));

        // Safe user summary — never expose password hash or internal db fields.
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("email", user.getEmail());
        userMap.put("name", name);
        userMap.put("googleSub", user.getGoogleId()); // alias matching Google's "sub" terminology

        // Assemble the full response matching the API contract shared across all four lang backends.
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Đăng nhập Google thành công!");
        response.put("access_token", accessToken);
        response.put("isNewUser", isNewUser);
        response.put("user", userMap);

        return response;
    }
}
