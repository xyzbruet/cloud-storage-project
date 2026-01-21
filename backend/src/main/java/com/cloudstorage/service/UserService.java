// =================================================================
// FILE 6: UserService.java
// Location: src/main/java/com/cloudstorage/service/UserService.java
// ===================================================================
package com.cloudstorage.service;

import com.cloudstorage.dto.request.UpdateProfileRequest;
import com.cloudstorage.dto.response.UserResponse;
import com.cloudstorage.model.User;
import com.cloudstorage.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final EmailService emailService;

    @Value("${profile.upload.dir:uploads/profile-pictures}")
    private String uploadDir;

    public UserResponse getCurrentUserProfile() {
        User user = authService.getCurrentUserEntity();
        return mapToUserResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(UpdateProfileRequest request) {
        User user = authService.getCurrentUserEntity();

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }

        userRepository.save(user);
        log.info("Profile updated for user: {}", user.getEmail());

        return mapToUserResponse(user);
    }

    @Transactional
    public String uploadProfilePicture(MultipartFile file) {
        User user = authService.getCurrentUserEntity();

        if (file.isEmpty()) {
            throw new RuntimeException("No file uploaded");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Only image files are allowed");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("File size must be less than 5MB");
        }

        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            if (user.getProfilePicture() != null) {
                try {
                    Path oldPath = Paths.get(user.getProfilePicture());
                    Files.deleteIfExists(oldPath);
                } catch (Exception e) {
                    log.warn("Failed to delete old profile picture: {}", e.getMessage());
                }
            }

            String extension = getFileExtension(file.getOriginalFilename());
            String filename = "profile-" + UUID.randomUUID() + extension;
            Path filePath = uploadPath.resolve(filename);

            Files.copy(file.getInputStream(), filePath);

            String fileUrl = "/" + uploadDir + "/" + filename;
            user.setProfilePicture(fileUrl);
            userRepository.save(user);

            log.info("Profile picture uploaded for user: {}", user.getEmail());
            return fileUrl;

        } catch (IOException e) {
            log.error("Error uploading profile picture", e);
            throw new RuntimeException("Failed to upload profile picture: " + e.getMessage());
        }
    }

    @Transactional
    public void sendEmailChangeOTP(String newEmail) {
        User user = authService.getCurrentUserEntity();

        userRepository.findByEmail(newEmail).ifPresent(existingUser -> {
            if (!existingUser.getId().equals(user.getId())) {
                throw new RuntimeException("Email already in use");
            }
        });

        String otp = user.generateOTP(User.OtpPurpose.EMAIL_CHANGE);
        userRepository.save(user);

        emailService.sendOTPEmail(newEmail, otp, User.OtpPurpose.EMAIL_CHANGE);
        log.info("Email change OTP sent to: {}", newEmail);
    }

    @Transactional
    public void verifyEmailChangeOTP(String newEmail, String otp) {
        User user = authService.getCurrentUserEntity();

        if (!user.verifyOTP(otp, User.OtpPurpose.EMAIL_CHANGE)) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        user.setEmail(newEmail);
        user.clearOTP();
        userRepository.save(user);

        log.info("Email updated successfully to: {}", newEmail);
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .profilePicture(user.getProfilePicture())
                .emailVerified(user.getEmailVerified())
                .storageUsed(user.getStorageUsed())
                .storageLimit(user.getStorageLimit())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private String getFileExtension(String filename) {
        if (filename == null) return ".jpg";
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot) : ".jpg";
    }
}