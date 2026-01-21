// ===============================================================
// FILE 3: EmailChangeOTPRequest.java
// Location: src/main/java/com/cloudstorage/dto/request/EmailChangeOTPRequest.java
// ===================================================================
package com.cloudstorage.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailChangeOTPRequest {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
}
