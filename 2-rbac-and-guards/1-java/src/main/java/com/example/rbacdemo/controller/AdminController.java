package com.example.rbacdemo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class AdminController {

    @GetMapping("/admin/dashboard")
    public Map<String, Object> getAdminDashboard() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("users", 100);
        stats.put("orders", 15);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Chào mừng Admin vào khu vực mật!");
        response.put("stats", stats);

        return response;
    }

    @GetMapping("/editor/articles")
    public Map<String, Object> getEditorArticles() {
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
        response.put("message", "Editor area — admin và editor đều xem được.");
        response.put("articles", articles);

        return response;
    }

    @GetMapping("/public/health")
    public Map<String, Object> getPublicHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        return response;
    }
}
