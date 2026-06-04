package com.example.refreshdemo.controller;

import com.example.refreshdemo.dto.SignInRequest;
import com.example.refreshdemo.dto.SignUpRequest;
import com.example.refreshdemo.dto.SignUpResponse;
import com.example.refreshdemo.dto.TokenResponse;
import com.example.refreshdemo.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
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
    public SignUpResponse signUp(@Valid @RequestBody SignUpRequest request) {
        return authService.signUp(request);
    }

    @PostMapping("/signin")
    public TokenResponse signIn(@Valid @RequestBody SignInRequest request) {
        return authService.signIn(request);
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Refresh token revoked or rotated", "Unauthorized");
        }
        String refreshToken = authHeader.substring(7);
        try {
            TokenResponse tokens = authService.refreshTokens(refreshToken);
            return ResponseEntity.ok(tokens);
        } catch (ResponseStatusException e) {
            return buildErrorResponse(HttpStatus.valueOf(e.getStatusCode().value()), e.getReason(), "Unauthorized");
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal == null || "anonymousUser".equals(principal)) {
            return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Unauthorized", "Unauthorized");
        }
        Long userId = Long.valueOf((String) principal);
        authService.logout(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out");
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<?> buildErrorResponse(HttpStatus status, String message, String error) {
        Map<String, Object> body = new HashMap<>();
        body.put("statusCode", status.value());
        body.put("message", message);
        body.put("error", error);
        return ResponseEntity.status(status).body(body);
    }
}
