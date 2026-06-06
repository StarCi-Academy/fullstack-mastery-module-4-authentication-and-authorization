package com.example.rbacdemo.entity;

import jakarta.persistence.*;

/**
 * JPA entity representing an application user stored in the {@code users} table.
 * The {@code role} string is embedded into the JWT so authorization guards can
 * read the user's role without querying the database on every request.
 */
@Entity
@Table(name = "users")
public class User {
    /** Auto-incremented surrogate primary key; used as the JWT {@code sub} claim. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique login identifier — enforced by the UNIQUE constraint on the column. */
    @Column(unique = true, nullable = false)
    private String email;

    /** BCrypt hash of the user's password — NEVER the plain-text password. */
    @Column(nullable = false)
    private String password;

    /**
     * RBAC role stored as a plain string.
     * Valid values: {@code "admin"}, {@code "editor"}, {@code "user"}, {@code "viewer"}.
     * The JwtAuthenticationFilter converts this to a Spring {@code ROLE_<NAME>} authority.
     */
    @Column(nullable = false)
    private String role;

    /** @return the auto-generated database primary key */
    public Long getId() {
        return id;
    }

    /** @param id the surrogate key to set (set by JPA — do not call manually) */
    public void setId(Long id) {
        this.id = id;
    }

    /** @return the user's unique email address */
    public String getEmail() {
        return email;
    }

    /** @param email the email address to assign (must be unique in the DB) */
    public void setEmail(String email) {
        this.email = email;
    }

    /** @return the BCrypt hash — never the raw password */
    public String getPassword() {
        return password;
    }

    /** @param password BCrypt-encoded password hash to store */
    public void setPassword(String password) {
        this.password = password;
    }

    /** @return the RBAC role string (e.g. {@code "admin"}) */
    public String getRole() {
        return role;
    }

    /** @param role plain role string to assign (e.g. {@code "user"}) */
    public void setRole(String role) {
        this.role = role;
    }
}
