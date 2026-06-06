package com.example.refreshdemo.controller;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller exposing protected user endpoints.
 * Used in the lesson to demonstrate that the access token issued by signin/refresh
 * actually grants access to secured resources.
 *
 * <ul>
 *   <li>GET /users/profile — returns the authenticated user's id; requires a valid AT</li>
 * </ul>
 *
 * Spring Security's authorization rules (configured in SecurityConfig) ensure this endpoint
 * is only reachable when a valid AT has been validated by JwtAuthenticationFilter.
 */
@RestController
@RequestMapping("/users")
public class UserController {

    /**
     * Returns the authenticated user's profile.
     * The user id is read from the Spring Security {@code SecurityContext}, which is populated
     * by {@code JwtAuthenticationFilter} when a valid access token is present.
     *
     * @return response map containing {@code message} and {@code user: { userId }}
     */
    @GetMapping("/profile")
    public Map<String, Object> getProfile() {
        // Principal is stored as String (user id) by JwtAuthenticationFilter.
        String userIdStr = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        // Parse to Long to match the database id type.
        Long userId = Long.valueOf(userIdStr);

        Map<String, Object> userMap = new HashMap<>();
        userMap.put("userId", userId);

        Map<String, Object> response = new HashMap<>();
        // Confirmation that the AT was valid and the request reached the protected handler.
        response.put("message", "You have accessed the protected area.");
        response.put("user", userMap);

        return response;
    }
}
