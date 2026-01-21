# ==========================================
# S3Config.java - AWS S3 Configuration (COMMENTED)
# ==========================================

/*
package com.cloudstorage.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {

    @Value("${aws.s3.region}")
    private String region;

    @Value("${aws.s3.access-key}")
    private String accessKey;

    @Value("${aws.s3.secret-key}")
    private String secretKey;

    @Bean
    public S3Client s3Client() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
        
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
        
        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }
}
*/

# ==========================================
# Deployment Instructions
# ==========================================

# FOR LOCAL DEVELOPMENT (PostgreSQL Storage):
# 1. Keep file.upload-dir: uploads
# 2. Files stored in: backend/uploads/ folder
# 3. Database stores only file metadata and path
# 4. No AWS configuration needed

# FOR CLOUD DEPLOYMENT (AWS S3):
# 1. Uncomment AWS S3 configuration in application.yml
# 2. Add AWS credentials
# 3. Uncomment S3Config.java
# 4. Uncomment AWS S3 methods in StorageService.java
# 5. Update FileService.java to use S3 methods
# 6. Add AWS S3 dependency in pom.xml:
#    <dependency>
#        <groupId>software.amazon.awssdk</groupId>
#        <artifactId>s3</artifactId>
#        <version>2.20.26</version>
#    </dependency>
