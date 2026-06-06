package com.example.refreshdemo.repository;

import com.example.refreshdemo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link User} entities.
 * Provides standard CRUD operations via {@link JpaRepository} plus a custom
 * email-lookup method used during signin and duplicate-email detection.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Finds a user by their unique email address.
     * Returns an empty Optional when no user exists with the given email —
     * callers should unify "not found" with "wrong password" to prevent email enumeration.
     *
     * @param email the email address to look up (case-sensitive, matches DB column value)
     * @return Optional containing the matching User, or empty if not found
     */
    Optional<User> findByEmail(String email);
}
