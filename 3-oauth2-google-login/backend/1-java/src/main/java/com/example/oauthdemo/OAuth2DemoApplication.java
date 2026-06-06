package com.example.oauthdemo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot application entry point for the OAuth2 Google Login demo.
 *
 * <p>The {@code @SpringBootApplication} annotation enables component scanning,
 * auto-configuration, and property source loading — all three are required for
 * the security config, JPA repositories, and JWT service to wire up automatically.
 */
@SpringBootApplication
public class OAuth2DemoApplication {

    /**
     * Bootstraps the Spring application context and starts the embedded web server.
     *
     * @param args command-line arguments forwarded to Spring's context initializer
     *             (e.g., {@code --server.port=3001} to override the default port).
     */
    public static void main(String[] args) {
        // Delegate to Spring Boot's standard launcher — it reads application.properties
        // and wires all beans before the server starts accepting requests.
        SpringApplication.run(OAuth2DemoApplication.class, args);
    }
}
