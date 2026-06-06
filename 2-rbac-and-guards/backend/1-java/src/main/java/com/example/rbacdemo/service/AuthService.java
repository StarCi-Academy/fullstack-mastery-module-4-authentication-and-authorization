package com.example.rbacdemo.service;

import com.example.rbacdemo.dto.SignInRequest;
import com.example.rbacdemo.dto.SignInResponse;
import com.example.rbacdemo.dto.SignUpRequest;
import com.example.rbacdemo.entity.User;
import com.example.rbacdemo.repository.UserRepository;
import com.example.rbacdemo.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

/**
 * Business logic for authentication.
 * Handles user registration (signup) and credential validation + JWT issuance (signin).
 */
@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * @param userRepository  JPA repository for user persistence
     * @param passwordEncoder BCrypt encoder injected from SecurityConfig
     * @param jwtService      generates and validates JWTs
     */
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /**
     * Registers a new user after checking for email uniqueness.
     * Password is hashed with BCrypt before persistence — never stored as plain text.
     *
     * @param request sign-up payload containing email, password, and optional role
     * @return confirmation map {@code {"message": "Created"}}
     * @throws ResponseStatusException (409 Conflict) if the email is already taken
     */
    public Map<String, String> signUp(SignUpRequest request) {
        // Reject duplicate emails before attempting a DB insert.
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword())); // BCrypt hash — never store plain text

        // Default to "user" role when the caller does not specify one.
        String role = request.getRole();
        if (role == null || role.trim().isEmpty()) {
            role = "user";
        }
        user.setRole(role);

        userRepository.save(user);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Created");
        return response;
    }

    /**
     * Validates credentials and issues a signed JWT embedding the user's role claim.
     * The role in the token lets the SecurityFilterChain make RBAC decisions without a DB query per request.
     *
     * @param request sign-in payload containing email and password
     * @return {@link SignInResponse} wrapping the access token
     * @throws ResponseStatusException (401 Unauthorized) on wrong email or mismatched password
     */
    public SignInResponse signIn(SignInRequest request) {
        // Look up user — throw 401 with a generic message to prevent email enumeration.
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        // BCrypt compare: raw password vs stored hash — same 401 message on mismatch to avoid enumeration.
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // Embed user ID (sub) and role in the JWT so downstream guards can read the role without hitting DB.
        String token = jwtService.generateToken(user.getId(), user.getRole());
        return new SignInResponse(token);
    }
}
