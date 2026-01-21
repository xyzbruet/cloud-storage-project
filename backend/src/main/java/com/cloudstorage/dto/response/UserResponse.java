package com.cloudstorage.dto.response;

import lombok.AllArgsConstructor;
import lombok.*;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String profilePicture;
    private Boolean emailVerified;
    private Long storageUsed;
    private Long storageLimit;
    private LocalDateTime createdAt;
}