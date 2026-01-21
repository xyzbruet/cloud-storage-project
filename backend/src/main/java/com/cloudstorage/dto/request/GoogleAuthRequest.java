package com.cloudstorage.dto.request;

import lombok.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GoogleAuthRequest {
    private String token;
}
