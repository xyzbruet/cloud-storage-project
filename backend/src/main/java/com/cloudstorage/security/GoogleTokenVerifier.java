package com.cloudstorage.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import org.springframework.stereotype.Component;

@Component
public class GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(GoogleIdTokenVerifier verifier) {
        this.verifier = verifier;
    }

    public GoogleIdToken.Payload verify(String token) {
        try {
            GoogleIdToken idToken = verifier.verify(token);

            if (idToken == null) {
                System.out.println("❌ Google ID Token verification failed");
                return null;
            }

            return idToken.getPayload();

        } catch (Exception e) {
            System.out.println("❌ Google token verification error: " + e.getMessage());
            return null;
        }
    }
}
