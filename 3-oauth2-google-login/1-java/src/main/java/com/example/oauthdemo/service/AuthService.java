package com.example.oauthdemo.service;

import com.example.oauthdemo.entity.User;
import com.example.oauthdemo.repository.UserRepository;
import com.example.oauthdemo.security.JwtService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    public Map<String, Object> findOrCreateGoogleUser(String googleId, String email, String firstName, String lastName, String picture) {
        Optional<User> userOpt = userRepository.findByGoogleId(googleId);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(email);
        }

        User user;
        boolean isNewUser;
        if (userOpt.isEmpty()) {
            user = new User();
            user.setEmail(email);
            user.setGoogleId(googleId);
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setPicture(picture);
            user.setPassword(null);
            user = userRepository.save(user);
            isNewUser = true;
        } else {
            user = userOpt.get();
            user.setGoogleId(googleId);
            if (firstName != null) user.setFirstName(firstName);
            if (lastName != null) user.setLastName(lastName);
            if (picture != null) user.setPicture(picture);
            user = userRepository.save(user);
            isNewUser = false;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("user", user);
        result.put("isNewUser", isNewUser);
        return result;
    }

    public Map<String, Object> completeGoogleLogin(User user, boolean isNewUser) {
        String accessToken = jwtService.generateToken(user.getId());

        String name = Stream.of(user.getFirstName(), user.getLastName())
                .filter(s -> s != null && !s.isEmpty())
                .collect(Collectors.joining(" "));

        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("email", user.getEmail());
        userMap.put("name", name);
        userMap.put("googleSub", user.getGoogleId());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Đăng nhập Google thành công!");
        response.put("access_token", accessToken);
        response.put("isNewUser", isNewUser);
        response.put("user", userMap);

        return response;
    }
}
