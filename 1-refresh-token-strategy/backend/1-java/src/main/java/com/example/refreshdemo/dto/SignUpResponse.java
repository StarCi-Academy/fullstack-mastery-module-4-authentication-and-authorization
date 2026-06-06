package com.example.refreshdemo.dto;

/**
 * Response body returned by POST /auth/signup on success (HTTP 201).
 * Contains only the safe public fields — the password hash is never exposed.
 */
public class SignUpResponse {

    /** Auto-generated database id of the newly created user. */
    private Long id;

    /** Email address of the newly created user. */
    private String email;

    /**
     * Constructs a signup response from the persisted user fields.
     *
     * @param id    the new user's database id
     * @param email the new user's email address
     */
    public SignUpResponse(Long id, String email) {
        this.id = id;
        this.email = email;
    }

    /**
     * Returns the user's database id.
     * @return numeric id
     */
    public Long getId() {
        return id;
    }

    /**
     * Sets the user's database id.
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
     * @param email email string
     */
    public void setEmail(String email) {
        this.email = email;
    }
}
