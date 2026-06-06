package com.example.refreshdemo.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom Spring Security authentication entry point.
 * Replaces the default HTML error response with a structured JSON body
 * that matches the lesson HTTP contract: {@code { "statusCode": 401, "message": "Unauthorized" }}.
 *
 * <p>Registered in {@link SecurityConfig} via
 * {@code exceptionHandling().authenticationEntryPoint(...)}.
 * Triggered whenever an unauthenticated request reaches a protected endpoint.</p>
 */
@Component
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {

    /**
     * Writes a JSON 401 response instead of the default Spring Security HTML challenge page.
     *
     * @param request       the request that triggered the authentication exception
     * @param response      the HTTP response to write the error into
     * @param authException the exception that caused the authentication failure
     * @throws IOException if writing the JSON body fails
     */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        // Set content type before writing the body — must be done before any output is flushed.
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // HTTP 401

        // Build the JSON error body matching the lesson contract.
        Map<String, Object> body = new HashMap<>();
        body.put("statusCode", 401);
        body.put("message", "Unauthorized");

        // Serialize and write the JSON body directly to the response output stream.
        ObjectMapper mapper = new ObjectMapper();
        mapper.writeValue(response.getOutputStream(), body);
    }
}
