package com.example.jwtdemo.controller;

import com.example.jwtdemo.dto.SignInRequest;
import com.example.jwtdemo.dto.SignInResponse;
import com.example.jwtdemo.dto.SignUpRequest;
import com.example.jwtdemo.dto.SignUpResponse;
import com.example.jwtdemo.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public SignUpResponse signUp(@Valid @RequestBody SignUpRequest request) {
        return authService.signUp(request);
    }

    @PostMapping("/signin")
    @ResponseStatus(HttpStatus.OK)
    public SignInResponse signIn(@Valid @RequestBody SignInRequest request) {
        return authService.signIn(request);
    }
}
