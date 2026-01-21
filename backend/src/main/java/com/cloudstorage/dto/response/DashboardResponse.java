package com.cloudstorage.dto.response;

import lombok.*;
import com.cloudstorage.model.File;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DashboardResponse {
    private long totalFiles;
    private long folders;
    private long starred;
    private List<File> recentFiles;
}
