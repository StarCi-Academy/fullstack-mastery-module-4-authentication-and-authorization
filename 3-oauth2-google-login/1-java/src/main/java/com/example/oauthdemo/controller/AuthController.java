package com.example.oauthdemo.controller;

import com.example.oauthdemo.entity.User;
import com.example.oauthdemo.service.AuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/google")
    public ResponseEntity<Void> googleRedirect() {
        String googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                "response_type=code&" +
                "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback&" +
                "scope=email%20profile&" +
                "client_id=dummy";

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(googleAuthUrl))
                .build();
    }

    @GetMapping("/google/callback")
    public ResponseEntity<?> googleCallback(@RequestParam(value = "code", required = false) String code) {
        if ("mockcode".equals(code)) {
            Map<String, Object> result = authService.findOrCreateGoogleUser(
                    "mock-google-sub-123",
                    "mock@demo.com",
                    "Mock",
                    "User",
                    null
            );
            User user = (User) result.get("user");
            boolean isNewUser = (boolean) result.get("isNewUser");

            Map<String, Object> response = authService.completeGoogleLogin(user, isNewUser);
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("statusCode", 401, "message", "Google authentication failed"));
    }
}
