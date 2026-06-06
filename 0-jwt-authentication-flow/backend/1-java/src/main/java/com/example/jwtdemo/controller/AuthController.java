package com.example.jwtdemo.controller;

import com.example.jwtdemo.dto.SignInRequest;
import com.example.jwtdemo.dto.SignInResponse;
import com.example.jwtdemo.dto.SignUpRequest;
import com.example.jwtdemo.dto.SignUpResponse;
import com.example.jwtdemo.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing unauthenticated {@code /auth/*} endpoints.
 *
 * <p>Both endpoints are permitted without a JWT token (see {@code SecurityConfig}).
 * Sign-up creates a user; sign-in issues a JWT access token for subsequent requests.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    /** Service that contains the registration and authentication business logic. */
    private final AuthService authService;

    /**
     * Constructs the controller with constructor-injected service.
     *
     * @param authService business logic layer for auth operations
     */
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Registers a new user and returns a minimal acknowledgement.
     * HTTP 201 Created — signals that a new resource was created.
     *
     * @param request validated sign-up body (email + password)
     * @return {@link SignUpResponse} containing the new user id and email
     */
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED) // REST convention: resource creation returns 201, not 200
    public SignUpResponse signUp(@Valid @RequestBody SignUpRequest request) {
        return authService.signUp(request);
    }

    /**
     * Validates credentials and returns a JWT access token.
     * HTTP 200 OK — no new resource is created, so 200 is correct here.
     *
     * @param request validated sign-in body (email + password)
     * @return {@link SignInResponse} containing the signed JWT access token
     */
    @PostMapping("/signin")
    @ResponseStatus(HttpStatus.OK)
    public SignInResponse signIn(@Valid @RequestBody SignInRequest request) {
        return authService.signIn(request);
    }
}
