package com.cloudstorage.service;

import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.dto.response.FileResponse;
import com.cloudstorage.dto.response.OwnerDTO;
import com.cloudstorage.model.File;
import com.cloudstorage.model.Folder;
import com.cloudstorage.model.User;
import com.cloudstorage.model.FileShare;
import com.cloudstorage.model.FolderShare;
import com.cloudstorage.repository.FileRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.repository.FileShareRepository;
import com.cloudstorage.repository.FolderShareRepository;
import com.cloudstorage.dto.response.ShareLinkResponse;
import com.cloudstorage.dto.response.SharedFileResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Optional;


@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final FileShareRepository fileShareRepository;
    private final FolderShareRepository folderShareRepository;
    private final FolderShareService folderShareService;
    
    // ================= CURRENT USER =================
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new RuntimeException("User not authenticated");
        }

        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ================= LIST FILES =================
    @Transactional(readOnly = true)
    public List<File> getUserFiles(Long folderId) {
        User user = getCurrentUser();

        if (folderId == null) {
            // Root level files (no folder) - only user's own files
            return fileRepository.findByUserAndFolderIsNullAndIsDeleted(user, false);
        }

        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        // Check if user has access to this folder
        if (!folder.getUser().getId().equals(user.getId())) {
            // Not the owner, check shared access
            String permission = folderShareService.getUserFolderPermission(folderId, user);
            if (permission == null) {
                throw new RuntimeException("Unauthorized: You don't have access to this folder");
            }
        }

        // Return all files in the folder (regardless of owner)
        return fileRepository.findByFolderAndIsDeleted(folder, false);
    }

    // ================= UPLOAD (KEEP ONLY THIS ONE) =================
    @Transactional
    public File uploadFile(MultipartFile file, Long folderId) throws IOException {
        User user = getCurrentUser();

        Folder folder = null;
        if (folderId != null) {
            folder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new RuntimeException("Folder not found"));
            
            // Check if user can upload to this folder
            if (!folder.getUser().getId().equals(user.getId())) {
                // Not the owner, check if they have edit permission
                if (!folderShareService.canEditFolder(folderId, user)) {
                    throw new RuntimeException("Unauthorized: You don't have edit permission for this folder");
                }
            }
        }

        File fileEntity = File.builder()
                .name(file.getOriginalFilename())
                .size(file.getSize())
                .mimeType(file.getContentType())
                .fileData(file.getBytes())
                .folder(folder)
                .user(user) // Uploader becomes the file owner
                .isDeleted(false)
                .isStarred(false)
                .build();

        return fileRepository.save(fileEntity);
    }

    public FileResponse upload(MultipartFile file, Long folderId) throws IOException {
        File saved = uploadFile(file, folderId);
        return toResponse(saved);
    }

    // ================= GET FILE =================
    public File getFile(Long id) {
        return getAccessibleFile(id);
    }

    // ================= DOWNLOAD =================
    public byte[] downloadFile(Long id) {
        return getAccessibleFile(id).getFileData();
    }

    // ================= DELETE (SOFT) =================
    @Transactional
    public void deleteFile(Long id) {
        User user = getCurrentUser();
        File file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found"));
        
        // Check if user has permission to delete
        boolean canDelete = false;
        
        // 1. Owner can always delete
        if (file.getUser().getId().equals(user.getId())) {
            canDelete = true;
        }
        // 2. User with edit permission in shared folder can delete
        else if (file.getFolder() != null) {
            if (folderShareService.canEditFolder(file.getFolder().getId(), user)) {
                canDelete = true;
            }
        }
        
        if (!canDelete) {
            throw new RuntimeException("Unauthorized: You don't have permission to delete this file");
        }
        
        // Soft delete with tracking
        file.setIsDeleted(true);
        file.setDeletedAt(LocalDateTime.now());
        file.setDeletedBy(user);
        fileRepository.save(file);
    }

    // ================= RESTORE =================
    @Transactional
    public File restoreFile(Long id) {
        File file = getAccessibleFile(id);
        
        // Only owner can restore
        if (!file.getUser().getId().equals(getCurrentUser().getId())) {
            throw new RuntimeException("Unauthorized: Only the owner can restore this file");
        }
        
        file.setIsDeleted(false);
        file.setDeletedAt(null);
        return fileRepository.save(file);
    }

    // ================= STAR =================
    @Transactional
    public FileResponse toggleStar(Long id) {
        File file = getAccessibleFile(id);
        file.setIsStarred(!Boolean.TRUE.equals(file.getIsStarred()));
        return toResponse(fileRepository.save(file));
    }

    // ================= SEARCH =================
    public List<File> searchFiles(String query) {
        return fileRepository.findByUserAndNameContainingIgnoreCaseAndIsDeleted(
                getCurrentUser(), query, false
        );
    }

    // ================= STARRED =================
    public List<FileResponse> getStarredFiles() {
        return fileRepository.findByUserAndIsStarredAndIsDeleted(
                getCurrentUser(), true, false
        )
        .stream()
        .map(this::toResponse)
        .toList();
    }

    // ================= TRASH =================
    public List<FileResponse> getTrashFiles() {
        return fileRepository.findByUserAndIsDeleted(getCurrentUser(), true)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ================= PERMANENT DELETE =================
    @Transactional
    public void permanentlyDeleteFile(Long id) {
        File file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found"));

        User currentUser = getCurrentUser();

        // Only owner can permanently delete
        if (!file.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException(
                "Unauthorized: Only the owner can permanently delete this file"
            );
        }

        // Must be in trash first
        if (!Boolean.TRUE.equals(file.getIsDeleted())) {
            throw new RuntimeException("File must be in trash before permanent deletion");
        }

        // Delete all shares first (foreign key constraint)
        fileShareRepository.deleteByFileId(id);

        // Then delete the file
        fileRepository.delete(file);
    }

    // ================= DTO MAPPER =================
    public FileResponse toResponse(File file) {
        Long folderId = file.getFolder() != null ? file.getFolder().getId() : null;

        // Build owner DTO
        OwnerDTO ownerDTO = OwnerDTO.builder()
                .id(file.getUser().getId())
                .name(file.getUser().getFullName())
                .email(file.getUser().getEmail())
                .build();

        return FileResponse.builder()
                .id(file.getId())
                .name(file.getName())
                .size(file.getSize())
                .mimeType(file.getMimeType())
                .isStarred(file.getIsStarred())
                .isDeleted(file.getIsDeleted())
                .owner(ownerDTO)
                .createdAt(file.getCreatedAt())
                .updatedAt(file.getUpdatedAt())
                .deleteAt(file.getDeletedAt())
                .isFolder(false)
                .folderId(folderId)
                .parentId(folderId)
                .build();
    }

    // ================= SHARE FILE WITH USER =================
    @Transactional
    public void shareFile(Long fileId, String email, String permission) {
        File file = getAccessibleFile(fileId);
        
        User targetUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        
        Optional<FileShare> existing = fileShareRepository.findByFileAndSharedWith(file, targetUser);
        if (existing.isPresent()) {
            // Update existing share permission
            FileShare share = existing.get();
            share.setPermission(permission);
            share.setIsActive(true);
            fileShareRepository.save(share);
            return;
        }
        
        FileShare share = FileShare.builder()
                .file(file)
                .sharedWith(targetUser)
                .sharedBy(getCurrentUser())
                .permission(permission)
                .isActive(true)
                .build();
                
        fileShareRepository.save(share);
    }

    // ================= GENERATE SHARE LINK =================
    @Transactional
    public ShareLinkResponse generateShareLink(Long fileId) {
        File file = getAccessibleFile(fileId);
        
        // Check if share link already exists
        Optional<FileShare> existingLink = fileShareRepository.findByFileAndIsActive(file, true)
                .stream()
                .filter(share -> share.getShareToken() != null && share.getSharedWith() == null)
                .findFirst();
        
        if (existingLink.isPresent()) {
            String shareUrl = "http://localhost:3000/s/" + existingLink.get().getShareToken();
            return ShareLinkResponse.builder()
                    .shareUrl(shareUrl)
                    .token(existingLink.get().getShareToken())
                    .build();
        }
        
        String token = UUID.randomUUID().toString().replace("-", "");
        
        FileShare shareLink = FileShare.builder()
                .file(file)
                .sharedBy(getCurrentUser())
                .shareToken(token)
                .permission("view")
                .isActive(true)
                .build();
        
        fileShareRepository.save(shareLink);
        
        String shareUrl = "http://localhost:3000/s/" + token;
        
        return ShareLinkResponse.builder()
                .shareUrl(shareUrl)
                .token(token)
                .build();
    }

    // ================= GET EXISTING SHARE LINK =================
    @Transactional(readOnly = true)
    public ShareLinkResponse getExistingShareLink(Long fileId) {
        File file = getAccessibleFile(fileId);
        
        Optional<FileShare> existingLink = fileShareRepository.findByFileAndIsActive(file, true)
                .stream()
                .filter(share -> share.getShareToken() != null && share.getSharedWith() == null)
                .findFirst();
        
        if (existingLink.isEmpty()) {
            return null;
        }
        
        String shareUrl = "http://localhost:3000/s/" + existingLink.get().getShareToken();
        return ShareLinkResponse.builder()
                .shareUrl(shareUrl)
                .token(existingLink.get().getShareToken())
                .build();
    }

    // ================= REVOKE SHARE LINK =================
    @Transactional
    public void revokeShareLink(Long fileId) {
        File file = getAccessibleFile(fileId);
        
        List<FileShare> publicLinks = fileShareRepository.findByFileAndIsActive(file, true)
                .stream()
                .filter(share -> share.getShareToken() != null && share.getSharedWith() == null)
                .toList();
        
        for (FileShare link : publicLinks) {
            link.setIsActive(false);
            fileShareRepository.save(link);
        }
    }

    // ================= GET SHARED WITH ME =================
    @Transactional(readOnly = true)
    public List<SharedFileResponse> getSharedWithMe() {
        User currentUser = getCurrentUser();
        
        return fileShareRepository.findBySharedWithAndIsActive(currentUser, true)
                .stream()
                .map(share -> SharedFileResponse.builder()
                        .id(share.getFile().getId())
                        .shareId(share.getId())        
                        .name(share.getFile().getName())
                        .size(share.getFile().getSize())
                        .mimeType(share.getFile().getMimeType())
                        .isStarred(share.getIsStarred())
                        .ownerEmail(share.getFile().getUser().getEmail())
                        .permission(share.getPermission())
                        .sharedAt(share.getCreatedAt())
                        .createdAt(share.getFile().getCreatedAt())
                        .build())
                .toList();
    }

    // ================= GET PEOPLE WITH ACCESS =================
    @Transactional(readOnly = true)
    public List<SharedFileResponse> getPeopleWithAccess(Long fileId) {
        File file = getAccessibleFile(fileId);

        return fileShareRepository.findByFileAndIsActive(file, true)
                .stream()
                .filter(share -> share.getSharedWith() != null)
                .map(share -> SharedFileResponse.builder()
                        .id(share.getSharedWith().getId())
                        .shareId(share.getId())
                        .email(share.getSharedWith().getEmail())
                        .permission(share.getPermission())
                        .sharedAt(share.getCreatedAt())
                        .build())
                .toList();
    }

    // ================= UPDATE SHARE PERMISSION =================
    @Transactional
    public void updateSharePermission(Long fileId, Long shareId, String permission) {
        File file = getAccessibleFile(fileId);
        
        FileShare share = fileShareRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share not found"));
        
        if (!share.getFile().getId().equals(file.getId())) {
            throw new RuntimeException("Share does not belong to this file");
        }
        
        share.setPermission(permission);
        fileShareRepository.save(share);
    }

    // ================= REVOKE SHARE =================
    @Transactional
    public void revokeShare(Long fileId, Long shareId) {
        File file = getAccessibleFile(fileId);

        FileShare share = fileShareRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share not found"));
        
        if (!share.getFile().getId().equals(file.getId())) {
            throw new RuntimeException("Share does not belong to this file");
        }
        
        share.setIsActive(false);
        fileShareRepository.save(share);
    }

    // ================= DISABLE SHARE LINK =================
    @Transactional
    public void disableShareLink(Long fileId, String token) {
        File file = getAccessibleFile(fileId);

        FileShare share = fileShareRepository.findByShareToken(token)
                .orElseThrow(() -> new RuntimeException("Share link not found"));
        
        if (!share.getFile().getId().equals(file.getId())) {
            throw new RuntimeException("Share link does not belong to this file");
        }
        
        share.setIsActive(false);
        fileShareRepository.save(share);
    }

    // ================= HELPER: GET ACCESSIBLE FILE =================
    private File getAccessibleFile(Long fileId) {
        User user = getCurrentUser();

        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        // Check if user owns the file
        boolean isOwner = file.getUser().getId().equals(user.getId());
        
        // Check if file is directly shared with user
        boolean isShared = fileShareRepository
                .existsByFileAndSharedWithAndIsActive(file, user, true);

        // Check if file has a public share link
        boolean hasPublic = fileShareRepository.hasPublicShareLink(file);
        
        // Check if user has access through folder sharing
        boolean hasFolderAccess = false;
        if (file.getFolder() != null) {
            String folderPermission = folderShareService.getUserFolderPermission(
                    file.getFolder().getId(), user);
            hasFolderAccess = (folderPermission != null);
        }

        if (!isOwner && !isShared && !hasPublic && !hasFolderAccess) {
            throw new RuntimeException("You do not have access to this file");
        }

        return file;
    }

    // ================= SAVE FILE =================
    @Transactional
    public void saveFile(File file) {
        fileRepository.save(file);
    }

    // ================= DOWNLOAD FILE VIA SHARE TOKEN =================
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> downloadFileViaShareToken(Long fileId, String shareToken) throws IOException {
        log.info("📥 Downloading file {} via share token", fileId);
        
        // Find the file
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        
        // Verify the share token is valid for the file's folder
        if (file.getFolder() == null) {
            throw new RuntimeException("File is not in a shared folder");
        }
        
        // Check if the folder has an active share with this token
        FolderShare share = folderShareRepository
                .findByShareTokenAndIsActiveTrue(shareToken)
                .orElseThrow(() -> new RuntimeException("Invalid or expired share link"));
        
        // Verify the file belongs to the shared folder (or a subfolder)
        boolean hasAccess = isFileInSharedFolder(file, share.getFolder());
        
        if (!hasAccess) {
            throw new RuntimeException("File is not in the shared folder");
        }
        
        // Return file data (stored in database)
        byte[] fileData = file.getFileData();
        if (fileData == null) {
            throw new RuntimeException("File data not found");
        }
        
        Resource resource = new org.springframework.core.io.ByteArrayResource(fileData);
        
        // Return file
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getMimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.getName() + "\"")
                .contentLength(fileData.length)
                .body(resource);
    }

    // ================= HELPER: CHECK IF FILE IN SHARED FOLDER =================
    private boolean isFileInSharedFolder(File file, Folder sharedFolder) {
        Folder current = file.getFolder();
        while (current != null) {
            if (current.getId().equals(sharedFolder.getId())) {
                return true;
            }
            current = current.getParent();
        }
        return false;
    }
}