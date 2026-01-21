package com.cloudstorage.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class StorageService {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @PostConstruct
    public void init() {
        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    public String uploadFileLocal(MultipartFile file) throws IOException {

        String originalFilename = file.getOriginalFilename();
        String extension = "";

        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        String uniqueFilename = UUID.randomUUID() + extension;
        Path filePath = Paths.get(uploadDir).resolve(uniqueFilename);

        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return uniqueFilename; // 🔥 storageKey
    }

    public byte[] getFileLocal(String storageKey) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(storageKey);

        if (!Files.exists(filePath)) {
            throw new IOException("File not found");
        }

        return Files.readAllBytes(filePath);
    }

    public void deleteFileLocal(String storageKey) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(storageKey);
        Files.deleteIfExists(filePath);
    }
}
