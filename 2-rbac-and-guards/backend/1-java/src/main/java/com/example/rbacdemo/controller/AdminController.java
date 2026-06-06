package com.example.rbacdemo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller demonstrating RBAC via Spring Security's path-level authorization rules.
 * Route-level access control is declared in {@code SecurityConfig.securityFilterChain}:
 * <ul>
 *   <li>/admin/** — {@code hasRole("ADMIN")}</li>
 *   <li>/editor/** — {@code hasAnyRole("ADMIN", "EDITOR")}</li>
 *   <li>/public/** — {@code permitAll()}</li>
 * </ul>
 * Controllers themselves are free of authorization annotations — all logic lives in SecurityConfig.
 */
@RestController
public class AdminController {

    /**
     * Admin-only dashboard protected by the {@code /admin/**} rule in SecurityConfig.
     * Returns a static mock payload — the lesson focuses on the RBAC guard, not real data.
     *
     * @return dashboard payload with mock user and order counts
     */
    @GetMapping("/admin/dashboard")
    public Map<String, Object> getAdminDashboard() {
        // Mock stats — real implementation would query a database.
        Map<String, Object> stats = new HashMap<>();
        stats.put("users", 100);
        stats.put("orders", 15);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Chào mừng Admin vào khu vực mật!");
        response.put("stats", stats);

        return response;
    }

    /**
     * Editor area — protected by the {@code /editor/**} rule allowing ADMIN or EDITOR (multi-role OR).
     * A USER or VIEWER token is rejected with 403 by Spring Security before this method is invoked.
     *
     * @return mock articles list payload
     */
    @GetMapping("/editor/articles")
    public Map<String, Object> getEditorArticles() {
        // Build mock article list — the lesson focuses on multi-role OR authorization.
        List<Map<String, Object>> articles = new ArrayList<>();

        Map<String, Object> a1 = new HashMap<>();
        a1.put("id", 1);
        a1.put("title", "Hello RBAC");
        articles.add(a1);

        Map<String, Object> a2 = new HashMap<>();
        a2.put("id", 2);
        a2.put("title", "Multi-role OR check");
        articles.add(a2);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Editor area — admin and editor can both access this.");
        response.put("articles", articles);

        return response;
    }

    /**
     * Public health endpoint — {@code /public/**} is declared as {@code permitAll()} in SecurityConfig
     * so no Authorization header is needed. Demonstrates bypassing authentication entirely for open routes.
     *
     * @return simple liveness payload {@code {"status": "ok"}}
     */
    @GetMapping("/public/health")
    public Map<String, Object> getPublicHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        return response;
    }
}
