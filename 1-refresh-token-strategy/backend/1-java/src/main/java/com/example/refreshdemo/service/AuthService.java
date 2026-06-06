package com.example.refreshdemo.service;

import com.example.refreshdemo.dto.SignInRequest;
import com.example.refreshdemo.dto.SignUpRequest;
import com.example.refreshdemo.dto.SignUpResponse;
import com.example.refreshdemo.dto.TokenResponse;
import com.example.refreshdemo.entity.User;
import com.example.refreshdemo.repository.UserRepository;
import com.example.refreshdemo.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Business logic for auth operations: signup, signin, token refresh, and logout.
 *
 * <p>Refresh-token strategy invariants:
 * <ul>
 *   <li>Only the bcrypt hash of the RT is persisted — the plaintext RT is never stored.</li>
 *   <li>On rotation: a new pair is issued, the new RT hash overwrites the old one in the DB.</li>
 *   <li>On logout: the hash is set to null, revoking all outstanding RTs for that user.</li>
 * </ul>
 * </p>
 */
@Service
public class AuthService {

    /** Repository for user CRUD operations against PostgreSQL. */
    private final UserRepository userRepository;

    /** BCrypt encoder; shared bean from SecurityConfig. */
    private final PasswordEncoder passwordEncoder;

    /** JWT signing / validation utility. */
    private final JwtService jwtService;

    /**
     * @param userRepository  JPA user repository
     * @param passwordEncoder BCrypt encoder (cost 10)
     * @param jwtService      JWT sign/validate utility
     */
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /**
     * Registers a new user with a bcrypt-hashed password.
     *
     * @param request signup payload (email + plaintext password)
     * @return {@link SignUpResponse} containing the new user's id and email
     * @throws ResponseStatusException 409 if the email is already registered
     */
    public SignUpResponse signUp(SignUpRequest request) {
        // Reject duplicate emails before hashing to fail fast and cheaply.
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        // Hash the password before persisting — never store plaintext passwords.
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        User saved = userRepository.save(user);
        // Return only public fields; the password hash is never exposed.
        return new SignUpResponse(saved.getId(), saved.getEmail());
    }

    /**
     * Authenticates credentials and issues an AT+RT pair.
     * Stores a bcrypt hash of the new RT in the DB immediately after issuance.
     *
     * @param request signin payload (email + plaintext password)
     * @return {@link TokenResponse} containing both access and refresh tokens
     * @throws ResponseStatusException 401 for unknown email or wrong password
     */
    public TokenResponse signIn(SignInRequest request) {
        // Look up user; unify "not found" and "wrong password" into one 401 to prevent email enumeration.
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        // Timing-safe comparison of the plaintext password against the stored hash.
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // Issue AT (15 m) and RT (7 d) using separate signing secrets.
        String access = jwtService.generateAccessToken(user.getId());
        String refresh = jwtService.generateRefreshToken(user.getId());

        // Persist the bcrypt hash of the fresh RT — enables comparison on the next /refresh call.
        user.setRefreshTokenHash(passwordEncoder.encode(refresh));
        userRepository.save(user);

        return new TokenResponse(access, refresh);
    }

    /**
     * Revokes the user's refresh token by setting its hash to null.
     * Any outstanding RT will be rejected on the next /auth/refresh call.
     *
     * @param userId user id extracted from the access token by the filter
     * @throws ResponseStatusException 404 if the user record does not exist
     */
    public void logout(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        // Null hash is the revocation signal: refreshTokens() will reject when hash is null.
        user.setRefreshTokenHash(null);
        userRepository.save(user);
    }

    /**
     * Validates the refresh token and issues a new AT+RT pair (rotation).
     * Two-step verification: (1) JWT signature/expiry via JwtService, then
     * (2) bcrypt hash comparison against the stored hash.
     *
     * @param refreshToken raw RT string from the "Authorization: Bearer" header
     * @return new {@link TokenResponse} with fresh AT and RT
     * @throws ResponseStatusException 401 when the token is expired, revoked, or hash-mismatched
     */
    public TokenResponse refreshTokens(String refreshToken) {
        // Step 1: Validate JWT signature and expiry before touching the DB.
        if (!jwtService.validateRefreshToken(refreshToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revoked or rotated");
        }

        // Extract the user id from the verified RT claims.
        String userIdStr = jwtService.getUserIdFromRefreshToken(refreshToken);
        Long userId = Long.valueOf(userIdStr);

        // Step 2: Load the user and check that the stored hash is not null (i.e. not logged out).
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revoked or rotated"));

        if (user.getRefreshTokenHash() == null ||
                !passwordEncoder.matches(refreshToken, user.getRefreshTokenHash())) {
            // Hash is null (logged out) or doesn't match (rotated/replayed token) — reject.
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revoked or rotated");
        }

        // Rotation: issue a new pair and immediately overwrite the old RT hash.
        String access = jwtService.generateAccessToken(user.getId());
        String refresh = jwtService.generateRefreshToken(user.getId());

        // Old hash is replaced → old RT is now permanently invalid.
        user.setRefreshTokenHash(passwordEncoder.encode(refresh));
        userRepository.save(user);

        return new TokenResponse(access, refresh);
    }
}
