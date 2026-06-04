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

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public SignUpResponse signUp(SignUpRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        User saved = userRepository.save(user);
        return new SignUpResponse(saved.getId(), saved.getEmail());
    }

    public TokenResponse signIn(SignInRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String access = jwtService.generateAccessToken(user.getId());
        String refresh = jwtService.generateRefreshToken(user.getId());

        user.setRefreshTokenHash(passwordEncoder.encode(refresh));
        userRepository.save(user);

        return new TokenResponse(access, refresh);
    }

    public void logout(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setRefreshTokenHash(null);
        userRepository.save(user);
    }

    public TokenResponse refreshTokens(String refreshToken) {
        if (!jwtService.validateRefreshToken(refreshToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revoked or rotated");
        }

        String userIdStr = jwtService.getUserIdFromRefreshToken(refreshToken);
        Long userId = Long.valueOf(userIdStr);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revoked or rotated"));

        if (user.getRefreshTokenHash() == null ||
                !passwordEncoder.matches(refreshToken, user.getRefreshTokenHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revoked or rotated");
        }

        String access = jwtService.generateAccessToken(user.getId());
        String refresh = jwtService.generateRefreshToken(user.getId());

        user.setRefreshTokenHash(passwordEncoder.encode(refresh));
        userRepository.save(user);

        return new TokenResponse(access, refresh);
    }
}
