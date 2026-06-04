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

    public Map<String, String> signUp(SignUpRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        
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

    public SignInResponse signIn(SignInRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateToken(user.getId(), user.getRole());
        return new SignInResponse(token);
    }
}
