package com.cloudstorage.dto.response;
import java.time.LocalDateTime;
import lombok.*;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OwnerDTO {
    private Long id;
    private String email;
    private String name;
}
