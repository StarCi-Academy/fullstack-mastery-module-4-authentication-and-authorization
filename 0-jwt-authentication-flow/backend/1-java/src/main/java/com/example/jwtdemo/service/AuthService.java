package com.example.jwtdemo.service;

import com.example.jwtdemo.dto.SignInRequest;
import com.example.jwtdemo.dto.SignInResponse;
import com.example.jwtdemo.dto.SignUpRequest;
import com.example.jwtdemo.dto.SignUpResponse;
import com.example.jwtdemo.entity.User;
import com.example.jwtdemo.entity.UserCredential;
import com.example.jwtdemo.repository.UserRepository;
import com.example.jwtdemo.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Business logic for user registration and authentication.
 *
 * <p>Passwords are stored as BCrypt hashes — the plain-text is never persisted.
 * On sign-in, a JWT carrying only the user id ({@code sub}) is issued so that
 * downstream services can verify identity without a session store lookup.
 */
@Service
public class AuthService {

    /** Repository for the {@code users} table (injected by Spring). */
    private final UserRepository userRepository;

    /** BCrypt encoder injected from {@link SecurityConfig#passwordEncoder()}. */
    private final PasswordEncoder passwordEncoder;

    /** JWT signing and parsing service. */
    private final JwtService jwtService;

    /**
     * Constructs the service with required dependencies via constructor injection.
     *
     * @param userRepository  JPA repository for user persistence
     * @param passwordEncoder BCrypt encoder for hash/verify operations
     * @param jwtService      handles JWT generation and validation
     */
    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /**
     * Registers a new user with a BCrypt-hashed password.
     *
     * @param request sign-up payload (email + plain-text password)
     * @return minimal acknowledgement with new user id and email
     * @throws ResponseStatusException HTTP 409 Conflict if the email already exists
     */
    public SignUpResponse signUp(SignUpRequest request) {
        // Guard: reject duplicate accounts to keep the email unique per user
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        // Build the user entity — email is the login identifier
        User user = new User();
        user.setEmail(request.getEmail());

        // Hash the password with BCrypt; one-way, so the plain-text never reaches the database
        UserCredential credential = new UserCredential();
        credential.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setCredential(credential); // Linked via cascade so both rows persist together

        User saved = userRepository.save(user);

        // Return only safe fields — never echo the hash or plain-text password
        return new SignUpResponse(saved.getId(), saved.getEmail());
    }

    /**
     * Validates credentials and issues a JWT access token on success.
     *
     * @param request sign-in payload (email + plain-text password)
     * @return {@link SignInResponse} containing the signed access token
     * @throws ResponseStatusException HTTP 401 Unauthorized for unknown email or wrong password
     */
    public SignInResponse signIn(SignInRequest request) {
        // Look up the user by email — unknown email → same 401 as wrong password (no enumeration)
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        // Compare the provided plain-text against the stored BCrypt hash
        if (user.getCredential() == null ||
                !passwordEncoder.matches(request.getPassword(), user.getCredential().getPassword())) {
            // Reject with the same message as "user not found" to prevent user-enumeration attacks
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // Sign a JWT carrying only the user id as the subject; no session is created
        String token = jwtService.generateToken(user.getId());
        return new SignInResponse(token);
    }
}
