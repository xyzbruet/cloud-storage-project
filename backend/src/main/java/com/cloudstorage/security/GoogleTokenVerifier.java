package com.cloudstorage.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;

    /**
     * Constructor with optional dependency injection
     * If GoogleIdTokenVerifier bean is not available (Google OAuth not configured),
     * this component will still be created but verifier will be null
     */
    @Autowired(required = false)
    public GoogleTokenVerifier(GoogleIdTokenVerifier verifier) {
        this.verifier = verifier;
        if (verifier != null) {
            log.info("✅ GoogleTokenVerifier initialized with verifier bean");
        } else {
            log.warn("⚠️ GoogleTokenVerifier created but verifier bean is NULL - Google OAuth not configured");
        }
    }

    /**
     * Verify Google ID Token and return payload
     * 
     * @param token Google credential token from frontend
     * @return GoogleIdToken.Payload if valid, null if invalid or not configured
     */
    public GoogleIdToken.Payload verify(String token) {
        // Check if verifier is available
        if (verifier == null) {
            log.error("❌ Google OAuth not configured - GoogleIdTokenVerifier is null");
            return null;
        }

        try {
            log.debug("🔍 Verifying Google token...");
            
            GoogleIdToken idToken = verifier.verify(token);

            if (idToken == null) {
                log.error("❌ Google ID Token verification failed - idToken is null");
                return null;
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            log.info("✅ Google token verified successfully");
            log.debug("Email from token: {}", payload.getEmail());
            
            return payload;

        } catch (Exception e) {
            log.error("❌ Google token verification error: {}", e.getMessage());
            log.debug("Full error details:", e);
            return null;
        }
    }
}