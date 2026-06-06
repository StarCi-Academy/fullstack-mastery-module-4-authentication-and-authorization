package com.example.oauthdemo.repository;

import com.example.oauthdemo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link User} persistence.
 *
 * <p>Provides the two lookup methods used by the two-stage upsert in {@link com.example.oauthdemo.service.AuthService}:
 * <ol>
 *   <li>{@link #findByGoogleId(String)} — primary lookup by the stable Google {@code sub} identifier.</li>
 *   <li>{@link #findByEmail(String)} — fallback lookup to link pre-existing local accounts with Google.</li>
 * </ol>
 *
 * <p>Spring Data generates the SQL at startup from the method names; no manual query is needed.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by their Google subject ({@code sub}) identifier.
     *
     * <p>Used as the primary lookup key on returning Google logins — {@code googleId} is stable
     * and never changes for the same Google account, unlike email which users can update.
     *
     * @param googleId the Google {@code sub} claim to search for.
     * @return an {@link Optional} containing the matching user, or empty if not found.
     */
    Optional<User> findByEmail(String email);

    /**
     * Finds a user by their email address.
     *
     * <p>Used as the fallback when no row matches {@code googleId} — enables silent account linking
     * where a user who previously registered with a local password can later log in via Google
     * using the same email without creating a duplicate row.
     *
     * @param email the email address to search for.
     * @return an {@link Optional} containing the matching user, or empty if not found.
     */
    Optional<User> findByGoogleId(String googleId);
}
