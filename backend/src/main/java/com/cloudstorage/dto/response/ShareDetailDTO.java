package com.cloudstorage.dto.response;

import lombok.*;
import lombok.Builder;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ShareDetailDTO {
    private Long shareId;
    private String email;
    private String name;
    private String permission;
    private LocalDateTime sharedAt;
}