package com.cloudstorage.controller;

import com.cloudstorage.dto.request.CreateFolderRequest;
import com.cloudstorage.dto.request.ShareRequest;
import com.cloudstorage.dto.response.ApiResponse;
import com.cloudstorage.dto.response.FolderResponse;
import com.cloudstorage.dto.response.ShareLinkResponse;
import com.cloudstorage.dto.response.SharedFileResponse;
import com.cloudstorage.service.FolderService;
import com.cloudstorage.service.FolderShareService;
import lombok.extern.slf4j.Slf4j;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;  // ADD THIS

import com.cloudstorage.model.User;
import com.cloudstorage.service.AuthService;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
@Slf4j  
@CrossOrigin(origins = "*")
public class FolderController {

    private final FolderService folderService;
    private final FolderShareService folderShareService;
    private final AuthService authService;

    // ================= ROOT FOLDERS =================
    @GetMapping
    @Transactional(readOnly = true)  // ADD THIS - FIX FOR THE ERROR YOU'RE SEEING
    public ResponseEntity<ApiResponse<List<FolderResponse>>> getRootFolders() {
        return ResponseEntity.ok(
                ApiResponse.success(folderService.getRootFolders()
                        .stream()
                        .map(folderService::toResponse)
                        .toList())
        );
    }

    // ================= SUB FOLDERS =================
    @GetMapping("/{parentId}/subfolders")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<List<FolderResponse>>> getSubFolders(
            @PathVariable Long parentId
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(folderService.getSubFolders(parentId)
                        .stream()
                        .map(folderService::toResponse)
                        .toList())
        );
    }

    // ================= CREATE =================
    @PostMapping
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<FolderResponse>> createFolder(
            @Valid @RequestBody CreateFolderRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(folderService.create(request))
        );
    }

    // ================= RENAME =================
    @PutMapping("/{id}")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<FolderResponse>> renameFolder(
            @PathVariable Long id,
            @Valid @RequestBody CreateFolderRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(folderService.rename(id, request.getName()))
        );
    }

    // ================= UPDATE (RENAME OR MOVE) =================
    @PatchMapping("/{id}")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<FolderResponse>> updateFolder(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates) {
        
        try {
            User currentUser = authService.getCurrentUserEntity();
            
            // For rename operation
            if (updates.containsKey("name")) {
                String newName = (String) updates.get("name");
                return ResponseEntity.ok(
                    ApiResponse.success(folderService.rename(id, newName))
                );
            }
            
            // For move operation
            if (updates.containsKey("parentId")) {
                Object parentIdObj = updates.get("parentId");
                Long parentId = extractLongId(parentIdObj);
                
                return ResponseEntity.ok(
                    ApiResponse.success(folderService.moveFolder(id, parentId, currentUser))
                );
            }
            
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No valid updates provided"));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // ================= DELETE (Move to Trash) =================
    @DeleteMapping("/{id}")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> deleteFolder(@PathVariable Long id) {
        folderService.moveToTrash(id);
        return ResponseEntity.ok(ApiResponse.success("Folder moved to trash", null));
    }

    // ================= RESTORE FROM TRASH =================
    @PostMapping("/{id}/restore")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<FolderResponse>> restoreFolder(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.success(folderService.restoreFromTrash(id))
        );
    }

    // ================= GET TRASH FOLDERS =================
    @GetMapping("/trash")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<List<FolderResponse>>> getTrashFolders() {
        return ResponseEntity.ok(
                ApiResponse.success(folderService.getTrashFolders()
                        .stream()
                        .map(folderService::toResponse)
                        .toList())
        );
    }

    // ================= PERMANENT DELETE =================
    @DeleteMapping("/{id}/permanent")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> permanentlyDeleteFolder(@PathVariable Long id) {
        folderService.permanentlyDelete(id);
        return ResponseEntity.ok(ApiResponse.success("Folder permanently deleted", null));
    }

    // ================= SHARE FOLDER WITH USER =================
    @PostMapping("/{id}/share")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> shareFolder(
            @PathVariable Long id,
            @RequestBody ShareRequest shareRequest) {

        User currentUser = authService.getCurrentUserEntity();

        folderShareService.shareFolderWithUser(
            id,
            shareRequest,
            currentUser
        );

        return ResponseEntity.ok(
            ApiResponse.success("Folder shared successfully", null)
        );
    }

    // ================= GET PEOPLE WITH ACCESS (SHARES) =================
    @GetMapping("/{id}/shares")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<List<SharedFileResponse>>> getFolderShares(
            @PathVariable Long id) {
        
        User currentUser = authService.getCurrentUserEntity();
        
        return ResponseEntity.ok(
            ApiResponse.success(folderShareService.getFolderShares(id, currentUser))
        );
    }

    // ================= GENERATE SHARE LINK =================
    @PostMapping("/{id}/share-link")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<ShareLinkResponse>> generateShareLink(
            @PathVariable Long id) {

        User currentUser = authService.getCurrentUserEntity();

        ShareLinkResponse response =
                folderShareService.generateShareLink(id, currentUser);

        return ResponseEntity.ok(
                ApiResponse.success(response)
        );
    }

    // ================= GET SHARE LINK =================
    @GetMapping("/{id}/share-link")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<ShareLinkResponse>> getShareLink(
            @PathVariable Long id) {

        ShareLinkResponse link =
                folderShareService.getExistingShareLink(id);

        return ResponseEntity.ok(
                ApiResponse.success(link)
        );
    }

    // ================= GET SHARED FOLDER (WITH SUBFOLDER SUPPORT) =================
    @GetMapping("/shared-link/{token}")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<FolderResponse>> getSharedFolder(
            @PathVariable String token,
            @RequestParam(required = false) Long subfolderId) {
        
        log.info("📥 GET /api/folders/shared-link/{} with subfolderId: {}", token, subfolderId);
        
        try {
            FolderResponse response;
            
            if (subfolderId != null) {
                // Fetch specific subfolder within the shared folder
                log.info("📂 Fetching subfolder {} within shared folder", subfolderId);
                response = folderShareService.getSharedSubfolderByToken(token, subfolderId);
            } else {
                // Fetch root shared folder
                log.info("📁 Fetching root shared folder");
                response = folderShareService.getSharedFolderByToken(token);
            }
            
            log.info("✅ Successfully retrieved folder: {}", response.getName());
            return ResponseEntity.ok(ApiResponse.success(response));
            
        } catch (Exception e) {
            log.error("❌ Failed to get shared folder: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // ================= DELETE SHARE LINK =================
    @DeleteMapping("/{id}/share-link")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> revokeShareLink(@PathVariable Long id) {
        folderShareService.revokeShareLink(id);
        return ResponseEntity.ok(ApiResponse.success("Share link deleted", null));
    }

    // ================= REVOKE SHARE =================
    @DeleteMapping("/{id}/shares/{shareId}")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> revokeShare(
            @PathVariable Long id,
            @PathVariable Long shareId) {
        folderShareService.revokeShare(id, shareId);
        return ResponseEntity.ok(ApiResponse.success("Access removed successfully", null));
    }

    // ================= UPDATE SHARE PERMISSION =================
    @PatchMapping("/{id}/shares/{shareId}")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> updateSharePermission(
            @PathVariable Long id,
            @PathVariable Long shareId,
            @RequestBody Map<String, String> request) {
        folderShareService.updateSharePermission(id, shareId, request.get("permission"));
        return ResponseEntity.ok(ApiResponse.success("Permission updated", null));
    }

    // ================= REMOVE ALL ACCESS =================
    @DeleteMapping("/{folderId}/shares/all")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> removeAllAccess(@PathVariable Long folderId) {
        folderShareService.removeAllAccessToFolder(folderId);
        return ResponseEntity.ok(
                ApiResponse.success("All access removed successfully", null)
        );
    }

    // ================= GET FOLDERS SHARED WITH ME =================
    @GetMapping("/shared-with-me")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<List<FolderResponse>>> getFoldersSharedWithMe() {
        User currentUser = authService.getCurrentUserEntity();
        return ResponseEntity.ok(
            ApiResponse.success(folderShareService.getFoldersSharedWithMe(currentUser))
        );
    }

    // ================= GET FOLDERS SHARED BY ME =================
    @GetMapping("/shared-by-me")
    @Transactional(readOnly = true)  // ADD THIS
    public ResponseEntity<ApiResponse<List<FolderResponse>>> getFoldersSharedByMe() {
        User currentUser = authService.getCurrentUserEntity();
        return ResponseEntity.ok(
            ApiResponse.success(folderShareService.getFoldersSharedByMe(currentUser))
        );
    }

    // ================= REMOVE SELF FROM SHARED FOLDER =================
    @DeleteMapping("/{folderId}/remove-me")
    @Transactional  // ADD THIS
    public ResponseEntity<ApiResponse<Void>> removeMeFromSharedFolder(
            @PathVariable Long folderId) {
        
        User currentUser = authService.getCurrentUserEntity();
        folderShareService.removeSelfFromSharedFolder(folderId, currentUser);
        
        return ResponseEntity.ok(
            ApiResponse.success("Removed from your drive", null)
        );
    }

    // ================= HELPER METHOD =================
    private Long extractLongId(Object idObj) {
        if (idObj == null) return null;
        if (idObj instanceof Integer) return ((Integer) idObj).longValue();
        if (idObj instanceof Long) return (Long) idObj;
        if (idObj instanceof String) return Long.parseLong((String) idObj);
        return null;
    }
}