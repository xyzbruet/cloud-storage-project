package com.cloudstorage.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.multipart.MultipartResolver;
import org.springframework.web.multipart.support.StandardServletMultipartResolver;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class FileUploadConfig {

    @Value("${app.upload.profile-pictures:/tmp/uploads/profile-pictures/}")
    private String profilePicturesPath;

    @Value("${app.upload.files:/tmp/uploads/files/}")
    private String filesPath;

    @Bean
    public MultipartResolver multipartResolver() {
        return new StandardServletMultipartResolver();
    }

    @PostConstruct
    public void createUploadDirectories() {
        try {
            createDirectoryIfNotExists(profilePicturesPath);
            createDirectoryIfNotExists(filesPath);
            System.out.println("✓ Upload directories created successfully");
        } catch (Exception e) {
            // Don't crash - just warn
            System.err.println("⚠ Warning: Could not create upload directories");
            System.err.println("  This is expected on Render. Files will be stored temporarily.");
            System.err.println("  Consider using Cloudinary for permanent storage.");
        }
    }

    private void createDirectoryIfNotExists(String directoryPath) throws Exception {
        Path path = Paths.get(directoryPath);
        if (Files.notExists(path)) {
            Files.createDirectories(path);
        }
    }
}