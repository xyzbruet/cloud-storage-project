package com.cloudstorage.controller;

import com.cloudstorage.dto.response.FolderResponse;
import com.cloudstorage.service.FolderShareService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/s")
@RequiredArgsConstructor
@Slf4j
public class ShareLinkController {
    
    private final FolderShareService folderShareService;
    
    /**
     * Get shared folder by token (root folder)
     * URL: /s/{token}
     */
    @GetMapping("/{token}")
    public ResponseEntity<FolderResponse> getSharedFolder(@PathVariable String token) {
        log.info("📥 Received request for shared folder with token: {}", token);
        
        try {
            FolderResponse folder = folderShareService.getSharedFolderByToken(token);
            log.info("✅ Successfully retrieved shared folder: {}", folder.getName());
            return ResponseEntity.ok(folder);
        } catch (RuntimeException e) {
            log.error("❌ Error retrieving shared folder: {}", e.getMessage());
            throw e;
        }
    }
    
    /**
     * Get shared subfolder by token
     * URL: /s/{token}/folder/{subfolderId}
     */
    @GetMapping("/{token}/folder/{subfolderId}")
    public ResponseEntity<FolderResponse> getSharedSubfolder(
            @PathVariable String token,
            @PathVariable Long subfolderId) {
        
        log.info("📥 Received request for subfolder {} with token: {}", subfolderId, token);
        
        try {
            FolderResponse folder = folderShareService.getSharedSubfolderByToken(token, subfolderId);
            log.info("✅ Successfully retrieved subfolder: {}", folder.getName());
            return ResponseEntity.ok(folder);
        } catch (RuntimeException e) {
            log.error("❌ Error retrieving subfolder: {}", e.getMessage());
            throw e;
        }
    }
}