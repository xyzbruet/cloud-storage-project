package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SharedByMeResponse {
    private Long id;
    private String name;
    private Long size;
    private String mimeType;
    private Boolean isStarred;
    private Boolean isFolder;

    private OwnerDTO owner;

    private Integer sharedWithCount;
    private List<ShareDetailDTO> sharedWith;
    private Boolean hasPublicLink;
    private String publicLink;
    private LocalDateTime createdAt;
}