package com.cloudstorage.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileResponse {
    private Long id;
    private String name;
    private Long size;
    private String mimeType;
    private Boolean isStarred;
    private Boolean isDeleted;
    private Boolean isFolder;
    private Long folderId;
    private Long parentId; 
   
    private OwnerDTO owner;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deleteAt;


}
