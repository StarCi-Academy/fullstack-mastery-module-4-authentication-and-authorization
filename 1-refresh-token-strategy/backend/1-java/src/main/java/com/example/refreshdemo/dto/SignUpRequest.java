package com.example.refreshdemo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /auth/signup.
 * Both fields are required and the email must pass RFC-5322 format validation.
 */
public class SignUpRequest {

    /**
     * User's email address. Must be a valid email format and must be unique in the database.
     * Used as the login identifier.
     */
    @NotBlank
    @Email
    private String email;

    /**
     * User's plaintext password. Will be BCrypt-hashed before storage.
     * Never stored or returned in plaintext.
     */
    @NotBlank
    private String password;

    /**
     * Returns the email address from the signup request.
     * @return email string
     */
    public String getEmail() {
        return email;
    }

    /**
     * Sets the email address for the signup request.
     * @param email valid email address
     */
    public void setEmail(String email) {
        this.email = email;
    }

    /**
     * Returns the plaintext password from the signup request.
     * @return plaintext password (only used for hashing; never persisted)
     */
    public String getPassword() {
        return password;
    }

    /**
     * Sets the plaintext password for the signup request.
     * @param password user's chosen password
     */
    public void setPassword(String password) {
        this.password = password;
    }
}
