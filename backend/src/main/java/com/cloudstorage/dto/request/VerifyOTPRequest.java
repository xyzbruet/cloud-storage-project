// package com.cloudstorage.dto.request;

// import jakarta.validation.constraints.Email;
// import jakarta.validation.constraints.NotBlank;
// import jakarta.validation.constraints.Pattern;
// import lombok.*;
// import lombok.AllArgsConstructor;
// import lombok.Data;
// import lombok.NoArgsConstructor;

// @Data
// @NoArgsConstructor
// @AllArgsConstructor
// public class VerifyOTPRequest {
    
//     @NotBlank(message = "Email is required")
//     @Email(message = "Invalid email format")
//     private String email;
    
//     @NotBlank(message = "OTP is required")
//     @Pattern(regexp = "\\d{6}", message = "OTP must be 6 digits")
//     private String otp;
// }