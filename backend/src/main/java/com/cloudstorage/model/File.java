package com.cloudstorage.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"fileData", "folder", "user"})
@EqualsAndHashCode(exclude = {"fileData", "folder", "user"})
public class File {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Long size;

    @Column(name = "mime_type")
    private String mimeType;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "file_data")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.BINARY)
    @JsonIgnore
    private byte[] fileData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Builder.Default
    @Column(name = "is_starred")
    private Boolean isStarred = false;
    
    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean isDeleted = false;

    // NEW: Soft delete timestamp
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // NEW: Who deleted the file
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    private User deletedBy;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
