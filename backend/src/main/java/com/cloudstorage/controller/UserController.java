// ================================================================
// FILE 5: UserController.java
// Location: src/main/java/com/cloudstorage/controller/UserController.java
// ===================================================================
package com.cloudstorage.controller;

import com.cloudstorage.dto.request.UpdateProfileRequest;
import com.cloudstorage.dto.request.EmailChangeOTPRequest;
import com.cloudstorage.dto.request.VerifyEmailOTPRequest;
import com.cloudstorage.dto.response.ApiResponse;
import com.cloudstorage.dto.response.UserResponse;
import com.cloudstorage.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile() {
        UserResponse user = userService.getCurrentUserProfile();
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse user = userService.updateProfile(request);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PostMapping("/profile-picture")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadProfilePicture(
            @RequestParam("profilePicture") MultipartFile file) {
        String pictureUrl = userService.uploadProfilePicture(file);
        Map<String, String> response = new HashMap<>();
        response.put("profilePicture", pictureUrl);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/send-email-otp")
    public ResponseEntity<ApiResponse<Void>> sendEmailChangeOTP(
            @Valid @RequestBody EmailChangeOTPRequest request) {
        userService.sendEmailChangeOTP(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("OTP sent to new email", null));
    }

    @PostMapping("/verify-email-otp")
    public ResponseEntity<ApiResponse<Void>> verifyEmailChangeOTP(
            @Valid @RequestBody VerifyEmailOTPRequest request) {
        userService.verifyEmailChangeOTP(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(ApiResponse.success("Email updated successfully", null));
    }
}