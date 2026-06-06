package com.example.refreshdemo.entity;

import jakarta.persistence.*;

/**
 * JPA entity representing an application user.
 * Mapped to the "users" table in PostgreSQL.
 *
 * <p>Key design: {@code refreshTokenHash} is nullable — null means the user has
 * logged out (RT revoked). Only a bcrypt hash is stored, never the plaintext RT.</p>
 */
@Entity
@Table(name = "users")
public class User {

    /** Auto-generated primary key (IDENTITY strategy, i.e. SERIAL in Postgres). */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique email address used as the login identifier. */
    @Column(unique = true, nullable = false)
    private String email;

    /** BCrypt hash of the user's plaintext password — never stored raw. */
    @Column(nullable = false)
    private String password;

    /**
     * BCrypt hash of the current refresh token.
     * Null when the user has logged out (revocation flag).
     * Overwritten on every successful rotation to invalidate old tokens.
     */
    @Column(nullable = true)
    private String refreshTokenHash;

    /**
     * Returns the user's database id.
     * @return numeric id
     */
    public Long getId() {
        return id;
    }

    /**
     * Sets the user id (typically managed by JPA; rarely called manually).
     * @param id new id value
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Returns the user's email address.
     * @return email string
     */
    public String getEmail() {
        return email;
    }

    /**
     * Sets the user's email address.
     * @param email new email value
     */
    public void setEmail(String email) {
        this.email = email;
    }

    /**
     * Returns the BCrypt-hashed password (never the plaintext).
     * @return password hash string
     */
    public String getPassword() {
        return password;
    }

    /**
     * Stores the BCrypt-hashed password.
     * @param password BCrypt hash to persist
     */
    public void setPassword(String password) {
        this.password = password;
    }

    /**
     * Returns the BCrypt hash of the current refresh token, or null if revoked.
     * @return refresh token hash or null
     */
    public String getRefreshTokenHash() {
        return refreshTokenHash;
    }

    /**
     * Updates the stored refresh token hash.
     * Pass null to revoke (logout); pass a new hash after rotation.
     * @param refreshTokenHash new BCrypt hash or null
     */
    public void setRefreshTokenHash(String refreshTokenHash) {
        this.refreshTokenHash = refreshTokenHash;
    }
}
