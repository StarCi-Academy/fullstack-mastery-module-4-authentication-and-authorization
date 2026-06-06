package com.example.refreshdemo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot entry point for the refresh-token strategy demo.
 * Auto-scans all components, repositories, and configurations under this package.
 *
 * <p>Run: {@code cd backend/1-java && mvn spring-boot:run}
 * (or {@code mvn spring-boot:run -Dserver.address=127.0.0.1} for loopback-only binding).</p>
 */
@SpringBootApplication
public class RefreshDemoApplication {

    /**
     * Application entry point. Delegates to Spring Boot's bootstrapping mechanism.
     *
     * @param args command-line arguments (passed to Spring for property overrides)
     */
    public static void main(String[] args) {
        // Start the embedded Tomcat server and initialize the Spring application context.
        SpringApplication.run(RefreshDemoApplication.class, args);
    }
}
