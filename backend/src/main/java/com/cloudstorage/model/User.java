package com.cloudstorage.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "users",
    indexes = {
        @Index(name = "idx_users_email", columnList = "email"),
        @Index(name = "idx_users_google_id", columnList = "google_id")
    }
)
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

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "profile_picture", length = 500)
    private String profilePicture;

    @Builder.Default
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;

    @Column(name = "google_id", unique = true, length = 255)
    private String googleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuthProvider provider;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;  // ADDED: Required for UserDetailsService

    @Builder.Default
    @Column(name = "storage_used", nullable = false)
    private Long storageUsed = 0L;

    @Builder.Default
    @Column(name = "storage_limit", nullable = false)
    private Long storageLimit = 5368709120L; // 5GB

    @Column(name = "otp_code", length = 6)
    private String otpCode;

    @Column(name = "otp_expires_at")
    private LocalDateTime otpExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "otp_purpose", length = 20)
    private OtpPurpose otpPurpose;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (email != null) {
            email = email.toLowerCase().trim();
        }
        if (isActive == null) {
            isActive = true;
        }
        if (emailVerified == null) {
            emailVerified = false;
        }
        if (storageUsed == null) {
            storageUsed = 0L;
        }
        if (storageLimit == null) {
            storageLimit = 5368709120L;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // OTP Methods
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

    // Helper methods
    public boolean isAccountActive() {
        return isActive != null && isActive;
    }

    public boolean hasStorageSpace(long fileSize) {
        return (storageUsed + fileSize) <= storageLimit;
    }

    public void addStorageUsage(long fileSize) {
        this.storageUsed += fileSize;
    }

    public void removeStorageUsage(long fileSize) {
        this.storageUsed = Math.max(0, this.storageUsed - fileSize);
    }

    public long getAvailableStorage() {
        return storageLimit - storageUsed;
    }

    public double getStorageUsagePercentage() {
        if (storageLimit == 0) return 0.0;
        return (storageUsed * 100.0) / storageLimit;
    }

    public enum OtpPurpose {
        LOGIN,
        REGISTER,
        EMAIL_CHANGE,
        PASSWORD_RESET
    }
}