package com.cloudstorage.dto.response;

import lombok.*;
import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SharedFileResponse {
    // Common fields
    private Long id;

    private String permission;
    private LocalDateTime sharedAt;
    
    // For files shared with me
    private String name;
    private Long size;
    private String mimeType;
    private Boolean isStarred;
    private String ownerEmail;
    private Long shareId;

    private LocalDateTime createdAt;
    
    // For people with access list
    private String email;

    

}