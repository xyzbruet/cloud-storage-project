package com.cloudstorage.controller;

import com.cloudstorage.dto.response.ApiResponse;
import com.cloudstorage.dto.response.FileResponse;
import com.cloudstorage.dto.response.FolderResponse;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.model.File;
import com.cloudstorage.service.FolderShareService;
import com.cloudstorage.service.ShareService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/s")
@RequiredArgsConstructor
@Slf4j
public class ShareLinkController {
    
    private final FolderShareService folderShareService;
    private final ShareService shareService;
    
    /**
     * Universal share link endpoint - detects if it's a file or folder
     * URL: /s/{token}
     */
    @GetMapping("/{token}")
    public ResponseEntity<?> getSharedResource(@PathVariable String token) {
        log.info("📥 Received share link request for token: {}", token);
        
        // Try folder first
        try {
            FolderResponse folder = folderShareService.getSharedFolderByToken(token);
            
            // ✅ Debug: Log the response structure
            log.info("✅ Share link is a FOLDER: {}", folder.getName());
            log.info("📋 Folder Response Details:");
            log.info("  - isFolder: {}", folder.getIsFolder());
            log.info("  - mimeType: {}", folder.getMimeType());
            log.info("  - files: {}", folder.getFiles() != null ? folder.getFiles().size() : 0);
            log.info("  - subfolders: {}", folder.getSubfolders() != null ? folder.getSubfolders().size() : 0);
            log.info("  - itemCount: {}", folder.getItemCount());
            
            return ResponseEntity.ok(ApiResponse.success(folder));
        } catch (ResourceNotFoundException folderEx) {
            log.debug("Not a folder share, trying file...");
        } catch (Exception folderEx) {
            log.debug("Error checking folder: {}", folderEx.getMessage());
        }
        
        // Try file
        try {
            FileResponse file = shareService.getSharedFileDetails(token);
            log.info("✅ Share link is a FILE: {}", file.getName());
            return ResponseEntity.ok(ApiResponse.success(file));
        } catch (ResourceNotFoundException fileEx) {
            log.error("❌ Token not found as folder or file: {}", token);
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("Invalid or expired share link"));
        } catch (Exception fileEx) {
            log.error("❌ Unexpected error: {}", fileEx.getMessage(), fileEx);
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Server error while loading shared content"));
        }
    }
    
    /**
     * Debug endpoint - check what the backend returns for a token
     * URL: /s/{token}/debug
     * Only accessible for testing - remove in production
     */
    @GetMapping("/{token}/debug")
    public ResponseEntity<?> debugShareLink(@PathVariable String token) {
        log.info("🔧 DEBUG: Checking share link token: {}", token);
        
        try {
            FolderResponse folder = folderShareService.getSharedFolderByToken(token);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ApiResponse.success(folder));
        } catch (Exception folderEx) {
            log.debug("Not a folder, trying file...");
        }
        
        try {
            FileResponse file = shareService.getSharedFileDetails(token);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ApiResponse.success(file));
        } catch (Exception fileEx) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("Token not found: " + fileEx.getMessage()));
        }
    }
    
    /**
     * Download shared file or file from shared folder
     * URL: /s/{token}/download (for single file shares)
     * URL: /s/{token}/download?fileId={fileId} (for files in shared folders)
     */
    @GetMapping("/{token}/download")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String token,
            @RequestParam(required = false) Long fileId) {
        
        log.info("⬇️ Download request - token: {}, fileId: {}", token, fileId);
        
        try {
            File file;
            
            // If fileId is provided, download that specific file from the shared folder
            if (fileId != null) {
                log.info("📁 Downloading file {} from shared folder", fileId);
                file = folderShareService.getFileFromSharedFolder(token, fileId);
            } else {
                // Otherwise, download the single file associated with this share token
                log.info("📄 Downloading single shared file");
                file = shareService.getSharedFileForDownload(token);
            }
            
            // File data is already loaded within transaction
            byte[] fileData = file.getFileData();
            
            if (fileData == null || fileData.length == 0) {
                log.error("❌ File data is null or empty for file: {}", file.getName());
                throw new RuntimeException("File data not found");
            }
            
            log.info("✅ Serving file: {} ({} bytes, type: {})", 
                     file.getName(), fileData.length, file.getMimeType());
            
            // Create ByteArrayResource from file data
            ByteArrayResource resource = new ByteArrayResource(fileData);
            
            // Determine media type
            MediaType mediaType;
            try {
                mediaType = MediaType.parseMediaType(file.getMimeType());
            } catch (Exception e) {
                log.warn("⚠️ Invalid mime type: {}, using application/octet-stream", file.getMimeType());
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }
            
            // Return file with proper headers
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .contentLength(fileData.length)
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + file.getName() + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .header(HttpHeaders.EXPIRES, "0")
                    .body(resource);
                    
        } catch (ResourceNotFoundException e) {
            log.error("❌ File not found: {}", e.getMessage());
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
            log.error("❌ Download failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }
    
    /**
     * Get shared subfolder by token
     * URL: /s/{token}/folder/{subfolderId}
     */
    @GetMapping("/{token}/folder/{subfolderId}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<FolderResponse>> getSharedSubfolder(
            @PathVariable String token,
            @PathVariable Long subfolderId) {
        
        log.info("📂 Request for subfolder {} with token: {}", subfolderId, token);
        
        try {
            FolderResponse folder = folderShareService.getSharedSubfolderByToken(token, subfolderId);
            log.info("✅ Retrieved subfolder: {}", folder.getName());
            return ResponseEntity.ok(ApiResponse.success(folder));
        } catch (ResourceNotFoundException e) {
            log.error("❌ Subfolder not found: {}", e.getMessage());
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("Subfolder not found"));
        } catch (Exception e) {
            log.error("❌ Error retrieving subfolder: {}", e.getMessage());
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Server error while loading subfolder"));
        }
    }
}