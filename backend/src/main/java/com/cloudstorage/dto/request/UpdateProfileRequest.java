package com.cloudstorage.dto.request;

import lombok.*;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String email;
    private String phone;
    private String profilePicture;
}