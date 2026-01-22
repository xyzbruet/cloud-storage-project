package com.cloudstorage.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "file_shares",
    indexes = {
        @Index(name = "idx_file_shares_file_id", columnList = "file_id"),
        @Index(name = "idx_file_shares_shared_with", columnList = "shared_with_user_id"),
        @Index(name = "idx_file_shares_shared_by", columnList = "shared_by_user_id"),
        @Index(name = "idx_file_shares_token", columnList = "share_token"),
        @Index(name = "idx_file_shares_active", columnList = "is_active")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_file_shared_with", columnNames = {"file_id", "shared_with_user_id"}),
        @UniqueConstraint(name = "uk_share_token", columnNames = {"share_token"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false, foreignKey = @ForeignKey(name = "fk_file_shares_file"))
    private File file;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_with_user_id", nullable = true, foreignKey = @ForeignKey(name = "fk_file_shares_shared_with"))
    private User sharedWith;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_by_user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_file_shares_shared_by"))
    private User sharedBy;

    @Column(name = "permission", nullable = false, length = 20)
    private String permission; // "view" or "edit"

    @Column(name = "share_token", unique = true, length = 255)
    private String shareToken;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_starred", nullable = false)
    @Builder.Default
    private Boolean isStarred = false;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isActive == null) {
            isActive = true;
        }
        if (isStarred == null) {
            isStarred = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        // Add any pre-update logic here if needed
    }

    // Helper methods
    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean canEdit() {
        return "edit".equalsIgnoreCase(permission);
    }

    public boolean canView() {
        return "view".equalsIgnoreCase(permission) || canEdit();
    }
}