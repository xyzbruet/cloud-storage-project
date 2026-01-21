package com.cloudstorage.service;

import com.cloudstorage.dto.request.*;
import com.cloudstorage.dto.response.AuthResponse;
import com.cloudstorage.dto.response.UserResponse;
import com.cloudstorage.model.AuthProvider;
import com.cloudstorage.model.User;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.JwtTokenProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;

    @Value("${google.client.id}")
    private String googleClientId;

    // ================= SEND LOGIN OTP =================
    @Transactional
    public void sendLoginOTP(LoginOTPRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        // Check if user is OAuth user
        if (user.getProvider() == AuthProvider.GOOGLE) {
            throw new RuntimeException("Please sign in using Google");
        }

        // Verify password
        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        // Generate and save OTP
        String otp = user.generateOTP(User.OtpPurpose.LOGIN);
        userRepository.save(user);

        // Send OTP email
        emailService.sendOTPEmail(user.getEmail(), otp, User.OtpPurpose.LOGIN);
        log.info("Login OTP sent to: {}", user.getEmail());
    }

    // ================= VERIFY LOGIN OTP =================
    @Transactional
    public AuthResponse verifyLoginOTP(VerifyOTPRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify OTP
        if (!user.verifyOTP(request.getOtp(), User.OtpPurpose.LOGIN)) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        // Clear OTP and mark email as verified
        user.clearOTP();
        user.setEmailVerified(true);
        userRepository.save(user);

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(user.getEmail());

        log.info("User logged in successfully: {}", user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    // ================= SEND REGISTER OTP =================
    @Transactional
    public void sendRegisterOTP(RegisterOTPRequest request) {
        // Check if email already registered and verified
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            if (user.getEmailVerified()) {
                throw new RuntimeException("Email already registered");
            }
        });

        User user = userRepository.findByEmail(request.getEmail())
                .map(existingUser -> {
                    // Update existing unverified user
                    existingUser.setPassword(passwordEncoder.encode(request.getPassword()));
                    existingUser.setFullName(request.getFullName());
                    existingUser.setPhone(request.getPhone() != null ? request.getPhone() : "");
                    return existingUser;
                })
                .orElseGet(() -> User.builder()
                        .email(request.getEmail().toLowerCase().trim())
                        .password(passwordEncoder.encode(request.getPassword()))
                        .fullName(request.getFullName())
                        .phone(request.getPhone() != null ? request.getPhone() : "")
                        .emailVerified(false)
                        .provider(AuthProvider.LOCAL)
                        .build()
                );

        // Generate and save OTP
        String otp = user.generateOTP(User.OtpPurpose.REGISTER);
        userRepository.save(user);

        // Send OTP email
        emailService.sendOTPEmail(user.getEmail(), otp, User.OtpPurpose.REGISTER);
        log.info("Register OTP sent to: {}", user.getEmail());
    }

    // ================= VERIFY REGISTER OTP =================
    @Transactional
    public AuthResponse verifyRegisterOTP(VerifyOTPRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getEmailVerified()) {
            throw new RuntimeException("User already verified");
        }

        // Verify OTP
        if (!user.verifyOTP(request.getOtp(), User.OtpPurpose.REGISTER)) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        // Clear OTP and mark email as verified
        user.clearOTP();
        user.setEmailVerified(true);
        userRepository.save(user);

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(user.getEmail());

        log.info("User registered successfully: {}", user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }
   
    // ================= GOOGLE LOGIN =================
    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(request.getCredential());
            if (idToken == null) {
                throw new RuntimeException("Invalid Google token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");

            // Find or create user
            User user = userRepository.findByEmail(email)
                    .orElseGet(() -> User.builder()
                            .googleId(googleId)
                            .email(email)
                            .fullName(name)
                            .profilePicture(picture)
                            .emailVerified(true)
                            .provider(AuthProvider.GOOGLE)
                            .build()
                    );

            // Link Google account if not already linked
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
                user.setEmailVerified(true);
                if (user.getProfilePicture() == null) {
                    user.setProfilePicture(picture);
                }
            }

            userRepository.save(user);

            // Generate JWT token
            String token = jwtTokenProvider.generateToken(user.getEmail());

            log.info("User logged in via Google: {}", user.getEmail());

            return AuthResponse.builder()
                    .token(token)
                    .user(mapToUserResponse(user))
                    .build();

        } catch (Exception e) {
            log.error("Google authentication failed", e);
            throw new RuntimeException("Google authentication failed: " + e.getMessage());
        }
    }

    // ================= GET CURRENT USER =================
    public AuthResponse getCurrentUser() {
        User user = getCurrentUserEntity();
        return AuthResponse.builder()
                .token(null)
                .user(mapToUserResponse(user))
                .build();
    }

    public User getCurrentUserEntity() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("User not authenticated");
        }

        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ================= HELPER =================
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
}