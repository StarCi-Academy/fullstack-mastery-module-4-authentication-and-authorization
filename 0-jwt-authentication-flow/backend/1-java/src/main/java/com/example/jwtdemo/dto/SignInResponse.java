package com.example.jwtdemo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SignInResponse {
    @JsonProperty("access_token")
    private String accessToken;

    public SignInResponse(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }
}
