package com.example.oauthdemo.entity;

import jakarta.persistence.*;

/**
 * JPA entity representing a user row in the {@code users} table.
 *
 * <p>Supports both local password accounts and OAuth-only (Google) accounts:
 * <ul>
 *   <li>Password-only users: {@code googleId} is {@code null}.</li>
 *   <li>OAuth-only users: {@code password} is {@code null} — credential lives at Google.</li>
 *   <li>Linked users: both fields are set after the user logs in via Google on a pre-existing account.</li>
 * </ul>
 *
 * <p>{@code googleId} holds Google's stable {@code sub} claim and is used as the primary
 * identity-matching key; {@code email} is the fallback for account linking.
 */
@Entity
@Table(name = "users")
public class User {
    /** Auto-incremented surrogate primary key — stable internal identifier. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique email address — used as login hint and as the account-linking fallback key. */
    @Column(unique = true, nullable = false)
    private String email;

    /**
     * bcrypt hash of the user's local password.
     * {@code null} for accounts created via Google OAuth — they have no local password.
     */
    @Column(nullable = true)
    private String password;

    /**
     * Google subject ({@code sub}) identifier — unique across all Google accounts.
     * {@code null} until the user logs in with Google for the first time.
     * Unique constraint prevents two rows from being linked to the same Google account.
     */
    @Column(name = "googleId", unique = true, nullable = true)
    private String googleId;

    /** User's given name from the Google profile, or set manually. */
    @Column(name = "firstName", nullable = true)
    private String firstName;

    /** User's family name from the Google profile, or set manually. */
    @Column(name = "lastName", nullable = true)
    private String lastName;

    /** URL to the user's profile photo returned by Google; used purely as a display hint. */
    @Column(nullable = true)
    private String picture;

    /** @return the auto-assigned surrogate primary key. */
    public Long getId() {
        return id;
    }

    /** @param id surrogate primary key to set (typically set by JPA on persist). */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return the user's unique email address. */
    public String getEmail() {
        return email;
    }

    /** @param email unique email address to assign. */
    public void setEmail(String email) {
        this.email = email;
    }

    /** @return the bcrypt-hashed password, or {@code null} for OAuth-only accounts. */
    public String getPassword() {
        return password;
    }

    /** @param password bcrypt hash to store; pass {@code null} for OAuth-only accounts. */
    public void setPassword(String password) {
        this.password = password;
    }

    /** @return Google's stable {@code sub} identifier, or {@code null} if not yet linked. */
    public String getGoogleId() {
        return googleId;
    }

    /** @param googleId Google {@code sub} claim to link this account to. */
    public void setGoogleId(String googleId) {
        this.googleId = googleId;
    }

    /** @return the user's given (first) name, or {@code null} if not provided. */
    public String getFirstName() {
        return firstName;
    }

    /** @param firstName given name from the Google profile or manual entry. */
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    /** @return the user's family (last) name, or {@code null} if not provided. */
    public String getLastName() {
        return lastName;
    }

    /** @param lastName family name from the Google profile or manual entry. */
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    /** @return URL of the user's profile photo, or {@code null} if not provided. */
    public String getPicture() {
        return picture;
    }

    /** @param picture URL of the profile photo from Google. */
    public void setPicture(String picture) {
        this.picture = picture;
    }
}
