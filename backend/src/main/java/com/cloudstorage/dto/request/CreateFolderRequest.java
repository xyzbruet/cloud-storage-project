package  com.cloudstorage.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateFolderRequest {
    @NotBlank(message = "Folder name is required")
    private String name;
    
    private Long parentId;
}
