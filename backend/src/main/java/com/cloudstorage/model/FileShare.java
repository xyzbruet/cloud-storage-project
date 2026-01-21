package com.cloudstorage.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "file_shares",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"file_id", "shared_with_user_id"}),
        @UniqueConstraint(columnNames = {"share_token"})
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
    @JoinColumn(name = "file_id", nullable = false)
    private File file;

    @ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "shared_with_user_id", nullable = true)
private User sharedWith;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_by_user_id", nullable = false)
    private User sharedBy;

    @Column(nullable = false)
    private String permission; // "view" or "edit"

    @Column(name = "share_token", unique = true)
    private String shareToken;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isStarred = false;


    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
