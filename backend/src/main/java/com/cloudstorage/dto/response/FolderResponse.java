package com.cloudstorage.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL) // ✅ Only include non-null fields in JSON
public class FolderResponse {
    // ========== Core Properties ==========
    private Long id;
    private String name;
    
    // ========== Type Detection (CRITICAL) ==========
    // ✅ These MUST be included for frontend type detection
    private Boolean isFolder;      // Must be true for folders
    private String mimeType;       // Must be "folder" for folders
    
    // ========== Hierarchy ==========
    private Long parentId;
    
    // ========== Content (for folders) ==========
    private List<Map<String, Object>> files;
    private List<Map<String, Object>> subfolders;
    private Integer itemCount;
    
    // ========== Sharing Info ==========
    private String permission;    // "view" or "edit"
    private String sharedBy;      // Name of person who shared
    private LocalDateTime sharedAt; // When it was shared
    
    // ========== Owner Info ==========
    private OwnerDTO owner;       // Owner details (for shared folders list)
    private String ownerEmail;    // Owner email (alternative format)
    
    // ========== Public Sharing ==========
    private Integer sharedWithCount;  // How many people it's shared with
    private Boolean hasPublicLink;    // Whether it has a public share link
    private String publicLink;        // The public share link URL
    
    // ========== Timestamps ==========
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}