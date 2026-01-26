package com.cloudstorage.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Slf4j
@Configuration
@ConditionalOnProperty(
    name = "google.client.id",
    havingValue = "",
    matchIfMissing = true
)
public class GoogleConfig {

    @Value("${google.client.id:}")
    private String googleClientId;

    @Bean(name = "googleIdTokenVerifier")
    public GoogleIdTokenVerifier googleIdTokenVerifier() throws GeneralSecurityException, IOException {
        log.info("🔧 Initializing Google OAuth2 Token Verifier");

        if (googleClientId == null || googleClientId.isEmpty()) {
            log.warn("⚠️ Google Client ID not configured - Google OAuth will be disabled");
            return null;
        }

        log.debug("Google Client ID configured: {}", googleClientId.substring(0, 10) + "...");

        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance()
            )
            .setAudience(Collections.singletonList(googleClientId))
            .build();

            log.info("✅ Google OAuth2 Token Verifier initialized successfully");
            return verifier;

        } catch (Exception e) {
            log.error("❌ Failed to initialize Google OAuth2 Token Verifier: {}", e.getMessage(), e);
            throw e;
        }
    }
}