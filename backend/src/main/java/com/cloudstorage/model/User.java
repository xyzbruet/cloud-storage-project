package com.cloudstorage.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "password")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(nullable = true)
    private String password;

    @Column(name = "phone")
    private String phone;

    @Column(name = "profile_picture")
    private String profilePicture;

    @Builder.Default
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;

    @Column(name = "google_id", unique = true)
    private String googleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider;

    @Builder.Default
    @Column(name = "storage_used", nullable = false)
    private Long storageUsed = 0L;

    @Builder.Default
    @Column(name = "storage_limit", nullable = false)
    private Long storageLimit = 5368709120L;

    @Column(name = "otp_code", length = 6)
    private String otpCode;

    @Column(name = "otp_expires_at")
    private LocalDateTime otpExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "otp_purpose", length = 20)
    private OtpPurpose otpPurpose;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (email != null) email = email.toLowerCase().trim();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String generateOTP(OtpPurpose purpose) {
        int otp = 100000 + (int) (Math.random() * 900000);
        this.otpCode = String.valueOf(otp);
        this.otpExpiresAt = LocalDateTime.now().plusMinutes(10);
        this.otpPurpose = purpose;
        return this.otpCode;
    }

    public boolean verifyOTP(String code, OtpPurpose purpose) {
        if (otpCode == null || code == null) return false;
        if (otpPurpose != purpose) return false;
        if (LocalDateTime.now().isAfter(otpExpiresAt)) return false;
        return otpCode.equals(code);
    }

    public void clearOTP() {
        this.otpCode = null;
        this.otpExpiresAt = null;
        this.otpPurpose = null;
    }

    public enum OtpPurpose {
        LOGIN,
        REGISTER,
        EMAIL_CHANGE
    }
}
