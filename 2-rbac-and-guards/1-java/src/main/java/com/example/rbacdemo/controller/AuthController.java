package com.example.rbacdemo.controller;

import com.example.rbacdemo.dto.SignInRequest;
import com.example.rbacdemo.dto.SignInResponse;
import com.example.rbacdemo.dto.SignUpRequest;
import com.example.rbacdemo.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> signUp(@Valid @RequestBody SignUpRequest request) {
        return authService.signUp(request);
    }

    @PostMapping("/signin")
    public SignInResponse signIn(@Valid @RequestBody SignInRequest request) {
        return authService.signIn(request);
    }
}
