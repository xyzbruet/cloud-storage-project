package com.cloudstorage.controller;

import com.cloudstorage.service.AuthService;
import com.cloudstorage.service.FolderService;
import com.cloudstorage.dto.request.ShareRequest;
import com.cloudstorage.dto.response.ShareLinkResponse;
import com.cloudstorage.dto.response.SharedFileResponse;
import com.cloudstorage.dto.response.SharedByMeResponse;
import com.cloudstorage.dto.response.ApiResponse;
import com.cloudstorage.dto.response.FileResponse;
import com.cloudstorage.model.File;
import com.cloudstorage.model.Folder;
import com.cloudstorage.model.User;
import com.cloudstorage.service.FileService;
import com.cloudstorage.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;  // ADD THIS

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class FileController {

    private final FileService fileService;
    private final ShareService shareService;
    private final AuthService authService;
    private final FolderService folderService;

    // ================= LIST FILES =================
    @GetMapping
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<List<FileResponse>>> getFiles(
            @RequestParam(required = false) Long folderId) {

        List<FileResponse> files = fileService.getUserFiles(folderId)
                .stream()
                .map(fileService::toResponse)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(files));
    }

    // ================= UPLOAD =================
    @PostMapping("/upload")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<FileResponse>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long folderId) throws IOException {

        return ResponseEntity.ok(
            ApiResponse.success(fileService.upload(file, folderId))
        );
    }

    // ================= DOWNLOAD WITH SHARE TOKEN SUPPORT =================
    @GetMapping("/{id}/download")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<Resource> downloadFileWithShareToken(
            @PathVariable Long id,
            @RequestParam(required = false) String shareToken) throws IOException {
        
        log.info("📥 Download request for file {} with shareToken: {}", id, shareToken);
        
        if (shareToken != null && !shareToken.isEmpty()) {
            // Public access via share token
            return fileService.downloadFileViaShareToken(id, shareToken);
        } else {
            // Authenticated access - return file data
            User currentUser = getCurrentUser();
            File file = fileService.getFile(id);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + file.getName() + "\"")
                    .contentType(MediaType.parseMediaType(file.getMimeType()))
                    .contentLength(file.getSize())
                    .body(new org.springframework.core.io.ByteArrayResource(fileService.downloadFile(id)));
        }
    }

    // ================= DELETE =================
    @DeleteMapping("/{id}")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> deleteFile(@PathVariable Long id) {
        fileService.deleteFile(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ================= RESTORE =================
    @PostMapping("/{id}/restore")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<File>> restoreFile(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.success(fileService.restoreFile(id))
        );
    }

    // ================= STAR =================
    @PostMapping("/{id}/star")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<FileResponse>> toggleStar(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.success(fileService.toggleStar(id))
        );
    }

    // ================= STARRED =================
    @GetMapping("/starred")
    @Transactional(readOnly = true)  // ADD THIS - THIS IS THE FIX FOR YOUR ERROR
    public ResponseEntity<ApiResponse<List<FileResponse>>> getStarredFiles() {
        return ResponseEntity.ok(
                ApiResponse.success(fileService.getStarredFiles())
        );
    }

    // ================= TRASH =================
    @GetMapping("/trash")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<List<FileResponse>>> getTrash() {
        return ResponseEntity.ok(
                ApiResponse.success(fileService.getTrashFiles())
        );
    }

    // ================= PERMANENT DELETE =================
    @DeleteMapping("/{id}/permanent")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> permanentlyDelete(@PathVariable Long id) {
        fileService.permanentlyDeleteFile(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ================= SHARE WITH USER =================
    @PostMapping("/{id}/share")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> shareFile(
            @PathVariable Long id,
            @RequestBody ShareRequest shareRequest) {

        User currentUser = authService.getCurrentUserEntity();
        shareService.shareFileWithUser(id, shareRequest, currentUser);

        return ResponseEntity.ok(
            ApiResponse.success("File shared successfully", null)
        );
    }

    // ================= GENERATE SHARE LINK =================
    @PostMapping("/{id}/share-link")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<ShareLinkResponse>> generateShareLink(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.success(fileService.generateShareLink(id))
        );
    }

    // ================= GET SHARED WITH ME =================
    @GetMapping("/shared-with-me")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<List<SharedFileResponse>>> getSharedWithMe() {
        return ResponseEntity.ok(
                ApiResponse.success(fileService.getSharedWithMe())
        );
    }

    // ================= GET PEOPLE WITH ACCESS =================
    @GetMapping("/{id}/shares")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<List<SharedFileResponse>>> getPeopleWithAccess(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.success(fileService.getPeopleWithAccess(id))
        );
    }

    // ================= REVOKE SHARE =================
    @DeleteMapping("/{id}/shares/{shareId}")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> revokeShare(
            @PathVariable Long id,
            @PathVariable Long shareId) {
        fileService.revokeShare(id, shareId);
        return ResponseEntity.ok(ApiResponse.success("Access removed successfully", null));
    }

    // ================= REMOVE SELF FROM SHARED ACCESS =================
    @DeleteMapping("/{fileId}/remove-me")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> removeMeFromSharedFile(@PathVariable Long fileId) {

        User currentUser = authService.getCurrentUserEntity();
        shareService.removeSelfFromSharedFile(fileId, currentUser);

        return ResponseEntity.ok(ApiResponse.success("Removed from your drive", null));
    }

    // ================= DISABLE SHARE LINK =================
    @PostMapping("/{id}/share-link/disable")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> disableShareLink(
            @PathVariable Long id,
            @RequestParam String token) {
        fileService.disableShareLink(id, token);
        return ResponseEntity.ok(ApiResponse.success("Share link disabled", null));
    }

    // ================= PUBLIC SHARE LINK (NO AUTH REQUIRED) =================
    @GetMapping("/shared-link/{token}")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<FileResponse>> getFileByShareLink(
            @PathVariable String token) {

        return ResponseEntity.ok(
                ApiResponse.success(shareService.getSharedFileDetails(token))
        );
    }

    // ================= PUBLIC SHARE LINK DOWNLOAD (NO AUTH REQUIRED) =================
    @GetMapping("/shared-link/{token}/download")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<byte[]> downloadByShareLink(
            @PathVariable String token) {

        File file = shareService.getSharedFileForDownload(token);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.getName() + "\"")
                .contentType(MediaType.parseMediaType(file.getMimeType()))
                .contentLength(file.getSize())
                .body(file.getFileData());
    }

    // ================= UPDATE SHARE PERMISSION =================
    @PatchMapping("/{id}/shares/{shareId}")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> updateSharePermission(
            @PathVariable Long id,
            @PathVariable Long shareId,
            @RequestBody Map<String, String> request) {
        fileService.updateSharePermission(id, shareId, request.get("permission"));
        return ResponseEntity.ok(ApiResponse.success("Permission updated", null));
    }

    // ================= GET EXISTING SHARE LINK =================
    @GetMapping("/{id}/share-link")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<ShareLinkResponse>> getShareLink(@PathVariable Long id) {
        ShareLinkResponse link = fileService.getExistingShareLink(id);
        if (link == null) {
            return ResponseEntity.ok(ApiResponse.success(null));
        }
        return ResponseEntity.ok(ApiResponse.success(link));
    }

    // ================= DELETE SHARE LINK =================
    @DeleteMapping("/{id}/share-link")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> revokeShareLink(@PathVariable Long id) {
        fileService.revokeShareLink(id);
        return ResponseEntity.ok(ApiResponse.success("Share link deleted", null));
    }

    // ================= GET FILES SHARED BY ME =================
    @GetMapping("/shared-by-me")
    @Transactional(readOnly = true)  // ADD THIS
    public ApiResponse<List<SharedByMeResponse>> getFilesSharedByMe() {
        User currentUser = authService.getCurrentUserEntity();   
        return ApiResponse.success(shareService.getFilesSharedByMe(currentUser));
    }

    // ================= REMOVE ALL ACCESS TO A FILE =================
    @DeleteMapping("/{fileId}/shares/all")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> removeAllAccess(@PathVariable Long fileId) {

        User currentUser = authService.getCurrentUserEntity();
        shareService.removeAllAccessToFile(fileId, currentUser);

        return ResponseEntity.ok(
                ApiResponse.success("All access removed successfully", null)
        );
    }

    // ================= TOGGLE STAR FOR SHARED FILE =================
    @PostMapping("/{fileId}/star-shared")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> toggleStarShared(@PathVariable Long fileId) {

        User currentUser = authService.getCurrentUserEntity();
        shareService.toggleStarForSharedFile(fileId, currentUser);

        return ResponseEntity.ok(
                ApiResponse.success("Star toggled successfully", null)
        );
    }

    // ================= UPDATE FILE (RENAME OR MOVE) =================
    @PutMapping("/{id}")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<FileResponse>> updateFile(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates) {
        
        try {
            User currentUser = authService.getCurrentUserEntity();
            File file = fileService.getFile(id);
            
            if (!file.getUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Access denied"));
            }
            
            boolean changed = false;
            
            if (updates.containsKey("name")) {
                file.setName((String) updates.get("name"));
                changed = true;
            }
            
            if (updates.containsKey("folderId")) {
                Long folderId = extractLongId(updates.get("folderId"));
                
                if (folderId == null) {
                    file.setFolder(null);
                    changed = true;
                } else {
                    Folder folder = folderService.getFolderById(folderId);
                    
                    if (!folder.getUser().getId().equals(currentUser.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(ApiResponse.error("Cannot move to this folder"));
                    }
                    
                    if (folder.getIsDeleted()) {
                        return ResponseEntity.badRequest()
                                .body(ApiResponse.error("Cannot move to a deleted folder"));
                    }
                    
                    file.setFolder(folder);
                    changed = true;
                }
            }
            
            if (!changed) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("No updates provided"));
            }
            
            file.setUpdatedAt(LocalDateTime.now());
            fileService.saveFile(file);
            
            return ResponseEntity.ok(
                ApiResponse.success(fileService.toResponse(file))
            );
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // ================= HELPER METHOD: GET CURRENT USER =================
    private User getCurrentUser() {
        return authService.getCurrentUserEntity();
    }

    // ================= HELPER METHOD: EXTRACT LONG ID =================
    private Long extractLongId(Object idObj) {
        if (idObj == null) return null;
        if (idObj instanceof Integer) return ((Integer) idObj).longValue();
        if (idObj instanceof Long) return (Long) idObj;
        if (idObj instanceof String) return Long.parseLong((String) idObj);
        return null;
    }
}