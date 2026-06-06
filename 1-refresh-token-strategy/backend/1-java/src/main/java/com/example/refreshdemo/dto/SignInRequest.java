package com.example.refreshdemo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /auth/signin.
 * Carries the user's email and plaintext password for credential verification.
 */
public class SignInRequest {

    /** User's registered email address. Must be a valid email format. */
    @NotBlank
    @Email
    private String email;

    /** Plaintext password to verify against the stored BCrypt hash. Never stored. */
    @NotBlank
    private String password;

    /**
     * Returns the email from the signin request.
     * @return email string
     */
    public String getEmail() {
        return email;
    }

    /**
     * Sets the email on the signin request.
     * @param email user's email address
     */
    public void setEmail(String email) {
        this.email = email;
    }

    /**
     * Returns the plaintext password from the signin request.
     * @return plaintext password (used only for bcrypt comparison; never stored)
     */
    public String getPassword() {
        return password;
    }

    /**
     * Sets the plaintext password on the signin request.
     * @param password user's plaintext password
     */
    public void setPassword(String password) {
        this.password = password;
    }
}
