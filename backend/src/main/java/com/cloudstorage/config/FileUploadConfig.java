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

    @Value("${app.upload.profile-pictures:uploads/profile-pictures/}")
    private String profilePicturesPath;

    @Value("${app.upload.files:uploads/files/}")
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
        } catch (Exception e) {
            throw new RuntimeException("Could not create upload directories", e);
        }
    }

    private void createDirectoryIfNotExists(String directoryPath) throws Exception {
        Path path = Paths.get(directoryPath);
        if (Files.notExists(path)) {
            Files.createDirectories(path);
        }
    }
}
