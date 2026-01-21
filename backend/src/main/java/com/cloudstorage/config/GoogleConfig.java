package com.cloudstorage.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;

import java.util.Collections;

@Configuration
@ConditionalOnExpression("'${google.client.id:}' != ''")
public class GoogleConfig {

    private final String clientId;

    public GoogleConfig(@Value("${google.client.id}") String clientId) {
        this.clientId = clientId;
    }

    @Bean
    public GoogleIdTokenVerifier googleIdTokenVerifier() throws Exception {
        return new GoogleIdTokenVerifier.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance()
        )
        .setAudience(Collections.singletonList(clientId))
        .build();
    }
}
