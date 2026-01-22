package com.cloudstorage.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/")
    public ResponseEntity<Map<String, String>> root() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "running");
        response.put("service", "Cloud Storage API");
        response.put("version", "1.0.0");
        response.put("message", "Welcome to Cloud Storage Backend API");
        return ResponseEntity.ok(response);
    }

    @GetMapping({"/api/health", "/api/v1/health"})
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now());
        response.put("service", "cloud-storage-backend");
        return ResponseEntity.ok(response);
    }
}