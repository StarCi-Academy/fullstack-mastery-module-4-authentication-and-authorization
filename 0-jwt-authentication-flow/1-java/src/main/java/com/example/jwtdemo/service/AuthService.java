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

        UserCredential credential = new UserCredential();
        credential.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setCredential(credential);

        User saved = userRepository.save(user);
        return new SignUpResponse(saved.getId(), saved.getEmail());
    }

    public SignInResponse signIn(SignInRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (user.getCredential() == null ||
                !passwordEncoder.matches(request.getPassword(), user.getCredential().getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateToken(user.getId());
        return new SignInResponse(token);
    }
}
