package com.cloudstorage.dto.request;

import lombok.*;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Getter
@Setter
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ShareRequest {
    private String email;
    private String permission;
    private Boolean sendEmail;
    private String message;
}