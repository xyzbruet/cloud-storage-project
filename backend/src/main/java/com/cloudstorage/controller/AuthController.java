package com.cloudstorage.controller;

import com.cloudstorage.dto.request.*;
import com.cloudstorage.dto.response.ApiResponse;
import com.cloudstorage.dto.response.AuthResponse;
import com.cloudstorage.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AuthController {

    private final AuthService authService;

    // ================= SEND LOGIN OTP =================
    @PostMapping("/send-login-otp")
    public ResponseEntity<ApiResponse<Void>> sendLoginOTP(
            @Valid @RequestBody LoginOTPRequest request) {
        authService.sendLoginOTP(request);
        return ResponseEntity.ok(
                ApiResponse.success("OTP sent to your email", null)
        );
    }

    // ================= VERIFY LOGIN OTP =================
    @PostMapping("/verify-login-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyLoginOTP(
            @Valid @RequestBody VerifyOTPRequest request) {
        AuthResponse response = authService.verifyLoginOTP(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ================= SEND REGISTER OTP =================
    @PostMapping("/send-register-otp")
    public ResponseEntity<ApiResponse<Void>> sendRegisterOTP(
            @Valid @RequestBody RegisterOTPRequest request) {
        authService.sendRegisterOTP(request);
        return ResponseEntity.ok(
                ApiResponse.success("OTP sent to your email", null)
        );
    }

    // ================= VERIFY REGISTER OTP =================
    @PostMapping("/verify-register-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyRegisterOTP(
            @Valid @RequestBody VerifyOTPRequest request) {
        AuthResponse response = authService.verifyRegisterOTP(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ================= GOOGLE LOGIN =================
    @PostMapping("/google-login")
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request) {
        AuthResponse response = authService.googleLogin(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // ================= GET CURRENT USER =================
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse>> getCurrentUser() {
        AuthResponse response = authService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}