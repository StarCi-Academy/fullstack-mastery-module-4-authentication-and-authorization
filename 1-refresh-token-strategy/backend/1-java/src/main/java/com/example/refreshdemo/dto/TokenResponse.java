package com.example.refreshdemo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO returned by POST /auth/signin and POST /auth/refresh.
 * Contains both the short-lived access token (15 min) and the long-lived refresh token (7 days).
 * JSON property names use snake_case to match the lesson HTTP contract.
 */
public class TokenResponse {

    /** Short-lived JWT access token; sign requests to protected endpoints with this. */
    @JsonProperty("access_token")
    private String accessToken;

    /**
     * Long-lived JWT refresh token; store securely and use only to rotate the token pair.
     * The server stores only the bcrypt hash of this value — never the plaintext.
     */
    @JsonProperty("refresh_token")
    private String refreshToken;

    /**
     * Constructs a token pair response.
     *
     * @param accessToken  signed access JWT string (15 min TTL)
     * @param refreshToken signed refresh JWT string (7 day TTL)
     */
    public TokenResponse(String accessToken, String refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    /**
     * Returns the access token string.
     * @return JWT access token
     */
    public String getAccessToken() {
        return accessToken;
    }

    /**
     * Sets the access token string.
     * @param accessToken new access token value
     */
    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    /**
     * Returns the refresh token string.
     * @return JWT refresh token
     */
    public String getRefreshToken() {
        return refreshToken;
    }

    /**
     * Sets the refresh token string.
     * @param refreshToken new refresh token value
     */
    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }
}
