package com.cloudstorage.dto.response;



import lombok.*;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FolderResponse {
    private Long id;
    private String name;
    private Boolean isFolder;
    private String mimeType; 
    private Long parentId;
    
    private OwnerDTO owner;

    private String ownerEmail;
    private String permission;

     private Integer itemCount;
     
    private LocalDateTime sharedAt;
    private Integer sharedWithCount;
    private Boolean hasPublicLink;
    private String publicLink;

    private String sharedBy; 
       
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

     private List<Map<String, Object>> files;
    private List<Map<String, Object>> subfolders;
    
} 
