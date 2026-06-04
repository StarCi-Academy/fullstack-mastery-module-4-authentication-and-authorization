package com.example.refreshdemo.controller;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/users")
public class UserController {
    @GetMapping("/profile")
    public Map<String, Object> getProfile() {
        String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Long userId = Long.valueOf(userIdStr);

        Map<String, Object> userMap = new HashMap<>();
        userMap.put("userId", userId);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Bạn đã truy cập vào khu vực bảo mật!");
        response.put("user", userMap);

        return response;
    }
}
