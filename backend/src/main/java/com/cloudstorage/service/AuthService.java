package com.cloudstorage.service;

import com.cloudstorage.dto.request.*;
import com.cloudstorage.dto.response.AuthResponse;
import com.cloudstorage.dto.response.UserResponse;
import com.cloudstorage.model.AuthProvider;
import com.cloudstorage.model.User;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.GoogleTokenVerifier;
import com.cloudstorage.security.JwtTokenProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    
    @Autowired(required = false)
    private GoogleTokenVerifier googleTokenVerifier;

    // ================= SIMPLE REGISTRATION =================
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.info("Registering new user: {}", request.getEmail());

        // Check if email already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        // Create new user
        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone() != null ? request.getPhone() : "")
                .emailVerified(true)
                .provider(AuthProvider.LOCAL)
                .build();

        userRepository.save(user);

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(user.getEmail());

        log.info("User registered successfully: {}", user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
    }

    // ================= SIMPLE LOGIN =================
    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for: {}", request.getEmail());

        // Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        // Check if user is OAuth user
        if (user.getProvider() == AuthProvider.GOOGLE) {
            throw new RuntimeException("Please sign in using Google");
        }

        // Verify password
        if (user.getPassword() == null || 
            !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(user.getEmail());

        log.info("User logged in successfully: {}", user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .user(mapToUserResponse(user))
                .build();
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

        if (auth == null || !auth.isAuthenticated() || 
            "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("User not authenticated");
        }

        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ================= GOOGLE LOGIN =================
    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        try {
            log.info("🔵 Starting Google login process...");
            
            // Check if Google OAuth is configured
            if (googleTokenVerifier == null) {
                log.error("❌ Google OAuth not configured - googleTokenVerifier is null");
                throw new RuntimeException("Google OAuth is not configured on the server");
            }
            
            // Verify Google token
            GoogleIdToken.Payload payload = googleTokenVerifier.verify(request.getCredential());
            
            if (payload == null) {
                log.error("❌ Google token verification failed");
                throw new RuntimeException("Invalid Google token");
            }

            // Extract and validate variables - MAKE FINAL FOR LAMBDA
            final String googleId = payload.getSubject();
            final String rawEmail = (String) payload.get("email");
            final String name = (String) payload.get("name");
            final String picture = (String) payload.get("picture");

            if (rawEmail == null || rawEmail.isEmpty()) {
                log.error("❌ Email not found in Google token payload");
                throw new RuntimeException("Email not found in Google token");
            }

            final String email = rawEmail.toLowerCase().trim();
            log.info("✅ Google token verified. Email: {}", email);

            // Find user by google_id first
            User user = userRepository.findByGoogleId(googleId)
                    .orElseGet(() -> findOrCreateUserByEmail(googleId, email, name, picture));

            userRepository.save(user);
            log.info("✅ User saved/updated: {}", user.getEmail());

            // Generate JWT token
            String token = jwtTokenProvider.generateToken(user.getEmail());
            log.info("✅ User logged in via Google: {}", user.getEmail());

            return AuthResponse.builder()
                    .token(token)
                    .user(mapToUserResponse(user))
                    .build();

        } catch (Exception e) {
            log.error("❌ Google authentication failed: {}", e.getMessage(), e);
            throw new RuntimeException("Google authentication failed: " + e.getMessage());
        }
    }

    /**
     * Helper method to find user by email or create new one
     * Extracted to avoid lambda variable issues
     */
    private User findOrCreateUserByEmail(String googleId, String email, String name, String picture) {
        return userRepository.findByEmail(email)
                .map(existingUser -> {
                    log.info("👤 User found by email: {}", email);
                    
                    // Link Google ID if not already set
                    if (existingUser.getGoogleId() == null) {
                        log.info("🔗 Linking Google ID to existing user");
                        existingUser.setGoogleId(googleId);
                    } else if (!existingUser.getGoogleId().equals(googleId)) {
                        log.warn("⚠️ User has different Google ID");
                    }
                    
                    // Update profile if empty
                    if (existingUser.getFullName() == null || existingUser.getFullName().isEmpty()) {
                        existingUser.setFullName(name != null ? name : "Google User");
                    }
                    if (existingUser.getProfilePicture() == null || existingUser.getProfilePicture().isEmpty()) {
                        existingUser.setProfilePicture(picture);
                    }
                    
                    return existingUser;
                })
                .orElseGet(() -> {
                    log.info("✨ Creating new user from Google: {}", email);
                    return User.builder()
                            .googleId(googleId)
                            .email(email)
                            .fullName(name != null ? name : "Google User")
                            .profilePicture(picture)
                            .emailVerified(true)
                            .provider(AuthProvider.GOOGLE)
                            .build();
                });
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

    // ================= FUTURE: LOGIN WITH OTP =================
    // @Transactional
    // public void sendLoginOTP(LoginOTPRequest request) {
    //     User user = userRepository.findByEmail(request.getEmail())
    //             .orElseThrow(() -> new RuntimeException("Invalid credentials"));
    //
    //     if (user.getProvider() == AuthProvider.GOOGLE) {
    //         throw new RuntimeException("Please sign in using Google");
    //     }
    //
    //     if (user.getPassword() == null || 
    //         !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
    //         throw new RuntimeException("Invalid credentials");
    //     }
    //
    //     String otp = user.generateOTP(User.OtpPurpose.LOGIN);
    //     userRepository.save(user);
    //
    //     emailService.sendOTPEmail(user.getEmail(), otp, User.OtpPurpose.LOGIN);
    //     log.info("Login OTP sent to: {}", user.getEmail());
    // }

    // @Transactional
    // public AuthResponse verifyLoginOTP(VerifyOTPRequest request) {
    //     User user = userRepository.findByEmail(request.getEmail())
    //             .orElseThrow(() -> new RuntimeException("User not found"));
    //
    //     if (!user.verifyOTP(request.getOtp(), User.OtpPurpose.LOGIN)) {
    //         throw new RuntimeException("Invalid or expired OTP");
    //     }
    //
    //     user.clearOTP();
    //     user.setEmailVerified(true);
    //     userRepository.save(user);
    //
    //     String token = jwtTokenProvider.generateToken(user.getEmail());
    //
    //     log.info("User logged in successfully: {}", user.getEmail());
    //
    //     return AuthResponse.builder()
    //             .token(token)
    //             .user(mapToUserResponse(user))
    //             .build();
    // }

    // ================= FUTURE: REGISTER WITH OTP =================
    // @Transactional
    // public void sendRegisterOTP(RegisterOTPRequest request) {
    //     userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
    //         if (user.getEmailVerified()) {
    //             throw new RuntimeException("Email already registered");
    //         }
    //     });
    //
    //     User user = userRepository.findByEmail(request.getEmail())
    //             .map(existingUser -> {
    //                 existingUser.setPassword(passwordEncoder.encode(request.getPassword()));
    //                 existingUser.setFullName(request.getFullName());
    //                 existingUser.setPhone(request.getPhone() != null ? request.getPhone() : "");
    //                 return existingUser;
    //             })
    //             .orElseGet(() -> User.builder()
    //                     .email(request.getEmail().toLowerCase().trim())
    //                     .password(passwordEncoder.encode(request.getPassword()))
    //                     .fullName(request.getFullName())
    //                     .phone(request.getPhone() != null ? request.getPhone() : "")
    //                     .emailVerified(false)
    //                     .provider(AuthProvider.LOCAL)
    //                     .build()
    //             );
    //
    //     String otp = user.generateOTP(User.OtpPurpose.REGISTER);
    //     userRepository.save(user);
    //
    //     try {
    //         emailService.sendOTPEmail(user.getEmail(), otp, User.OtpPurpose.REGISTER);
    //         log.info("Register OTP sent to: {}", user.getEmail());
    //     } catch (Exception e) {
    //         log.error("Failed to send OTP email to: {}", user.getEmail(), e);
    //         user.clearOTP();
    //         userRepository.save(user);
    //         throw new RuntimeException("Failed to send OTP email");
    //     }
    // }

    // @Transactional
    // public AuthResponse verifyRegisterOTP(VerifyOTPRequest request) {
    //     User user = userRepository.findByEmail(request.getEmail())
    //             .orElseThrow(() -> new RuntimeException("User not found"));
    //
    //     if (user.getEmailVerified()) {
    //         throw new RuntimeException("User already verified");
    //     }
    //
    //     if (!user.verifyOTP(request.getOtp(), User.OtpPurpose.REGISTER)) {
    //         throw new RuntimeException("Invalid or expired OTP");
    //     }
    //
    //     user.clearOTP();
    //     user.setEmailVerified(true);
    //     userRepository.save(user);
    //
    //     String token = jwtTokenProvider.generateToken(user.getEmail());
    //
    //     log.info("User registered successfully: {}", user.getEmail());
    //
    //     return AuthResponse.builder()
    //             .token(token)
    //             .user(mapToUserResponse(user))
    //             .build();
    // }
}