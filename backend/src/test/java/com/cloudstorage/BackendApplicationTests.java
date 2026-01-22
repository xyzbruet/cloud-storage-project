package com.cloudstorage;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    // Database
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    
    // JWT
    "jwt.secret=test-jwt-secret-for-testing-only",
    
    // Google
    "google.client.id=test-client-id",
    
    // AWS
    "aws.access.key.id=test-access-key",
    "aws.secret.access.key=test-secret-key",
    "aws.region=us-east-1",
    "aws.s3.bucket.name=test-bucket",
    
    // Email/SMTP
    "spring.mail.host=smtp.test.com",
    "spring.mail.port=587",
    "spring.mail.username=test@example.com",
    "spring.mail.password=test-password",
    "spring.mail.properties.mail.smtp.auth=true",
    "spring.mail.properties.mail.smtp.starttls.enable=true",
    
    // App Configuration
    "APP_BASE_URL=http://localhost:3000",
    "FRONTEND_URL=http://localhost:3000",
    
    // Server
    "server.port=8080"
})
class BackendApplicationTests {

    @Test
    void contextLoads() {
        // This test will pass if the application context loads successfully
    }
}