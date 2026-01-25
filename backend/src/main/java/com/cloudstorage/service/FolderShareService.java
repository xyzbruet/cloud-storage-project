package com.cloudstorage.service;

import com.cloudstorage.model.File;
import java.time.LocalDateTime;

import com.cloudstorage.dto.request.ShareRequest;
import com.cloudstorage.dto.response.ShareLinkResponse;
import com.cloudstorage.dto.response.SharedFileResponse;
import com.cloudstorage.dto.response.FolderResponse;

import com.cloudstorage.model.Folder;
import com.cloudstorage.model.FolderShare;
import com.cloudstorage.model.User;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.FolderShareRepository;
import com.cloudstorage.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.cloudstorage.dto.response.OwnerDTO;
import com.cloudstorage.repository.FileRepository;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FolderShareService {

    private final FolderRepository folderRepository;
    private final FolderShareRepository folderShareRepository;
    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.base-url}")
    private String baseUrl;


    // ================= AUTH =================

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    // ================= PERMISSION CHECK =================

    /**
     * Check if user has access to a folder (directly or through parent folders)
     * Returns the permission level (view/edit) or null if no access
     */
    @Transactional(readOnly = true)
    public String getUserFolderPermission(Long folderId, User user) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
        
        // Check if user owns the folder
        if (folder.getUser().getId().equals(user.getId())) {
            return "owner";
        }
        
        // Check if user has direct access to this folder
        java.util.Optional<FolderShare> directShare = folderShareRepository
                .findByFolderAndSharedWith(folder, user);
        
        if (directShare.isPresent() && directShare.get().getIsActive()) {
            return directShare.get().getPermission();
        }
        
        // Check parent folders recursively for inherited permissions
        Folder current = folder.getParent();
        while (current != null) {
            java.util.Optional<FolderShare> parentShare = folderShareRepository
                    .findByFolderAndSharedWith(current, user);
            
            if (parentShare.isPresent() && parentShare.get().getIsActive()) {
                return parentShare.get().getPermission();
            }
            current = current.getParent();
        }
        
        return null; // No access
    }

    /**
     * Verify user has at least view access to a folder
     */
    public boolean canAccessFolder(Long folderId, User user) {
        String permission = getUserFolderPermission(folderId, user);
        return permission != null;
    }

    /**
     * Verify user has edit access to a folder
     */
    public boolean canEditFolder(Long folderId, User user) {
        String permission = getUserFolderPermission(folderId, user);
        return "edit".equals(permission) || "owner".equals(permission);
    }

    // ================= USER BASED SHARING =================

    @Transactional
    public void shareFolderWithUser(
            Long folderId,
            ShareRequest request,
            User currentUser
    ) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        if (!folder.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        User sharedWith = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if already shared
        FolderShare share = folderShareRepository
                .findByFolderAndSharedWith(folder, sharedWith)
                .orElse(
                        FolderShare.builder()
                                .folder(folder)
                                .owner(folder.getUser())
                                .sharedBy(currentUser)
                                .sharedWith(sharedWith)
                                .build()
                );

        share.setPermission(request.getPermission());
        share.setIsActive(true);

        folderShareRepository.save(share);

        // Send email notification
        if (Boolean.TRUE.equals(request.getSendEmail())) {
            emailService.sendFolderShareEmail(
                    sharedWith.getEmail(),
                    currentUser.getFullName(),
                    folder.getName(),
                    request.getPermission()
            );
        }
    }

    // ================= GET FOLDER SHARES =================
    @Transactional(readOnly = true)
    public List<SharedFileResponse> getFolderShares(Long folderId, User currentUser) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        // Verify ownership
        if (!folder.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("You do not have permission to view shares for this folder");
        }

        List<FolderShare> shares = folderShareRepository.findByFolderAndIsActiveTrue(folder);

        return shares.stream()
                .filter(share -> share.getSharedWith() != null)
                .map(share -> SharedFileResponse.builder()
                        .id(share.getSharedWith().getId())
                        .shareId(share.getId())
                        .email(share.getSharedWith().getEmail())
                        .permission(share.getPermission())
                        .sharedAt(share.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    // ================= LINK BASED SHARING =================

    @Transactional
    public ShareLinkResponse generateShareLink(Long folderId, User currentUser) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        if (!folder.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        FolderShare publicShare = folderShareRepository
                .findByFolderAndShareTokenIsNotNullAndIsActiveTrue(folder)
                .orElseGet(() -> {
                    FolderShare fs = FolderShare.builder()
                            .folder(folder)
                            .owner(folder.getUser())
                            .sharedBy(currentUser)
                            .permission("view")
                            .shareToken(UUID.randomUUID().toString())
                            .isActive(true)
                            .build();
                    return folderShareRepository.save(fs);
                });

        String shareUrl = baseUrl + "/s/" + publicShare.getShareToken();

        return ShareLinkResponse.builder()
                .token(publicShare.getShareToken())
                .shareUrl(shareUrl)
                .permission(publicShare.getPermission())
                .isActive(true)
                .build();
    }

    @Transactional(readOnly = true)
    public ShareLinkResponse getExistingShareLink(Long folderId) {
        User owner = getCurrentUser();

        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        if (!folder.getUser().getId().equals(owner.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        
        return folderShareRepository
                .findByFolderAndShareTokenIsNotNullAndIsActiveTrue(folder)
                .map(share -> ShareLinkResponse.builder()
                        .token(share.getShareToken())
                        .shareUrl(baseUrl + "/s/" + share.getShareToken())
                        .permission(share.getPermission())
                        .isActive(true)
                        .build())
                .orElse(null);
    }

    @Transactional
    public void revokeShareLink(Long folderId) {
        User owner = getCurrentUser();

        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        if (!folder.getUser().getId().equals(owner.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        folderShareRepository
                .findByFolderAndShareTokenIsNotNullAndIsActiveTrue(folder)
                .ifPresent(share -> {
                    share.setIsActive(false);
                    folderShareRepository.save(share);
                });
    }

    // ================= SHARE MANAGEMENT =================

    @Transactional
    public void revokeShare(Long folderId, Long shareId) {
        User owner = getCurrentUser();

        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        if (!folder.getUser().getId().equals(owner.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        FolderShare share = folderShareRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share not found"));

        if (!share.getFolder().getId().equals(folderId)) {
            throw new RuntimeException("Share does not belong to this folder");
        }

        share.setIsActive(false);
        folderShareRepository.save(share);
    }

    @Transactional
    public void updateSharePermission(Long folderId, Long shareId, String permission) {
        User owner = getCurrentUser();

        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        if (!folder.getUser().getId().equals(owner.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        FolderShare share = folderShareRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share not found"));

        if (!share.getFolder().getId().equals(folderId)) {
            throw new RuntimeException("Share does not belong to this folder");
        }

        share.setPermission(permission);
        folderShareRepository.save(share);
    }

    // ================= REMOVE ALL ACCESS =================
    @Transactional
    public void removeAllAccessToFolder(Long folderId) {
        User owner = getCurrentUser();

        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        if (!folder.getUser().getId().equals(owner.getId())) {
            throw new RuntimeException("Unauthorized: Only the owner can remove all access");
        }

        List<FolderShare> shares = folderShareRepository.findByFolderAndIsActiveTrue(folder);
        
        for (FolderShare share : shares) {
            share.setIsActive(false);
            folderShareRepository.save(share);
        }
        
        markAsDeleted(folder, owner);
        
        log.info("All access removed and folder soft-deleted: {}", folderId);
    }

    // ================= SHARED WITH ME =================
    @Transactional(readOnly = true)
    public List<FolderResponse> getFoldersSharedWithMe(User currentUser) {
        List<FolderShare> shares = folderShareRepository
                .findBySharedWithAndIsActive(currentUser, true);

        return shares.stream()
                .map(share -> FolderResponse.builder()
                        .id(share.getFolder().getId())
                        .name(share.getFolder().getName())
                        .isFolder(true)
                        .mimeType("folder")
                        .ownerEmail(share.getFolder().getUser().getEmail())
                        .permission(share.getPermission())
                        .sharedAt(share.getCreatedAt())
                        .createdAt(share.getFolder().getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    // ================= SHARED BY ME =================
    @Transactional(readOnly = true)
    public List<FolderResponse> getFoldersSharedByMe(User currentUser) {
        List<Folder> ownedFolders = folderRepository.findByUserAndIsDeleted(currentUser, false);
        
        return ownedFolders.stream()
                .filter(folder -> {
                    List<FolderShare> shares = folderShareRepository
                            .findByFolderAndIsActiveTrue(folder);
                    return !shares.isEmpty();
                })
                .map(folder -> {
                    List<FolderShare> shares = folderShareRepository
                            .findByFolderAndIsActiveTrue(folder);
                    
                    OwnerDTO ownerDTO = OwnerDTO.builder()
                            .id(folder.getUser().getId())
                            .name(folder.getUser().getFullName())
                            .email(folder.getUser().getEmail())
                            .build();
                    
                    long userShareCount = shares.stream()
                            .filter(s -> s.getSharedWith() != null)
                            .count();
                    
                    boolean hasPublicLink = shares.stream()
                            .anyMatch(s -> s.getShareToken() != null && 
                                          s.getSharedWith() == null);
                    
                    String publicLink = null;
                    if (hasPublicLink) {
                        publicLink = shares.stream()
                                .filter(s -> s.getShareToken() != null && 
                                            s.getSharedWith() == null)
                                .findFirst()
                               .map(s -> baseUrl + "/s/" + s.getShareToken())  // ✅ FIXED
                                .orElse(null);
                    }
                    
                    FolderResponse.FolderResponseBuilder builder = FolderResponse.builder()
                            .id(folder.getId())
                            .name(folder.getName())
                            .isFolder(true)
                            .mimeType("folder")
                            .owner(ownerDTO)
                            .sharedWithCount((int) userShareCount)
                            .hasPublicLink(hasPublicLink)
                            .createdAt(folder.getCreatedAt());
                    
                    if (publicLink != null) {
                        builder.publicLink(publicLink);
                    }
                    
                    return builder.build();
                })
                .collect(Collectors.toList());
    }

    /**
 * Get a file from a shared folder for download
 * Verifies that the file belongs to the shared folder or its subfolders
 */
@Transactional(readOnly = true)
public File getFileFromSharedFolder(String token, Long fileId) {
    log.info("📥 Getting file {} from shared folder with token {}", fileId, token);
    
    // Verify the share token is valid
    FolderShare share = folderShareRepository
            .findByShareTokenAndIsActiveTrue(token)
            .orElseThrow(() -> new RuntimeException("Invalid or expired share link"));
    
    Folder sharedRootFolder = share.getFolder();
    log.info("✅ Valid share found for root folder: {}", sharedRootFolder.getName());
    
    // Get the file
    File file = fileRepository.findById(fileId)
            .orElseThrow(() -> new RuntimeException("File not found"));
    
    log.info("📄 File found: {}", file.getName());
    
    // Verify the file belongs to the shared folder or its subfolders
    Folder fileFolder = file.getFolder();
    if (fileFolder == null) {
        log.error("❌ File has no folder");
        throw new RuntimeException("File does not belong to any folder");
    }
    
    // Check if file's folder is the shared folder or a subfolder of it
    if (!fileFolder.getId().equals(sharedRootFolder.getId()) && 
        !isSubfolderOf(fileFolder, sharedRootFolder)) {
        log.error("❌ File {} is not within shared folder {}", fileId, sharedRootFolder.getId());
        throw new RuntimeException("This file is not within the shared folder");
    }
    
    log.info("✅ Access verified - file is within shared hierarchy");
    
    // Eagerly load file data within transaction
    byte[] fileData = file.getFileData();
    if (fileData == null || fileData.length == 0) {
        log.error("❌ File data is null or empty for file ID: {}", fileId);
        throw new RuntimeException("File data not found in database");
    }
    
    log.info("✅ File data loaded: {} bytes", fileData.length);
    
    return file;
}



    // ================= REMOVE SELF =================
    @Transactional
    public void removeSelfFromSharedFolder(Long folderId, User currentUser) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        FolderShare share = folderShareRepository.findByFolderAndSharedWith(folder, currentUser)
                .orElseThrow(() -> new RuntimeException("You don't have access to this folder"));

        share.setIsActive(false);
        folderShareRepository.save(share);
    }

    // ================= GET SHARED FOLDER BY TOKEN =================
    @Transactional(readOnly = true)
    public FolderResponse getSharedFolderByToken(String token) {
        log.info("🔍 Getting shared folder with token: {}", token);
        
        FolderShare share = folderShareRepository
                .findByShareTokenAndIsActiveTrue(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired share link"));
        
        Folder folder = share.getFolder();
        log.info("✅ Found shared folder: {}", folder.getName());
        
        return buildFolderResponse(folder, share);
    }

    // ================= GET SHARED SUBFOLDER BY TOKEN =================
    @Transactional(readOnly = true)
    public FolderResponse getSharedSubfolderByToken(String token, Long subfolderId) {
        log.info("🔍 Getting subfolder {} with token {}", subfolderId, token);
        
        FolderShare share = folderShareRepository
                .findByShareTokenAndIsActiveTrue(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired share link"));
        
        Folder sharedRootFolder = share.getFolder();
        log.info("✅ Valid share found for root folder: {}", sharedRootFolder.getName());
        
        Folder subfolder = folderRepository.findById(subfolderId)
                .orElseThrow(() -> new RuntimeException("Subfolder not found"));
        
        log.info("📂 Subfolder found: {}", subfolder.getName());
        
        if (!isSubfolderOf(subfolder, sharedRootFolder)) {
            log.error("❌ Subfolder {} is not within shared folder {}", 
                      subfolderId, sharedRootFolder.getId());
            throw new RuntimeException("This folder is not within the shared folder");
        }
        
        log.info("✅ Access verified - subfolder is within shared hierarchy");
        
        return buildFolderResponse(subfolder, share);
    }

    // ================= HELPER METHODS =================

    private FolderResponse buildFolderResponse(Folder folder, FolderShare share) {
        log.info("🏗️ Building response for folder: {}", folder.getName());
        
        List<java.util.Map<String, Object>> subfolders = folderRepository
                .findByParentAndIsDeleted(folder, false)
                .stream()
                .map(subfolder -> {
                    java.util.Map<String, Object> subMap = new java.util.HashMap<>();
                    subMap.put("id", subfolder.getId());
                    subMap.put("name", subfolder.getName());
                    subMap.put("itemCount", countFolderItems(subfolder));
                    subMap.put("createdAt", subfolder.getCreatedAt());
                    subMap.put("updatedAt", subfolder.getUpdatedAt());
                    return subMap;
                })
                .toList();
        
        log.info("📁 Found {} subfolders", subfolders.size());
        
        List<java.util.Map<String, Object>> files = fileRepository
                .findByFolderAndIsDeleted(folder, false)
                .stream()
                .map(file -> {
                    java.util.Map<String, Object> fileMap = new java.util.HashMap<>();
                    fileMap.put("id", file.getId());
                    fileMap.put("name", file.getName());
                    fileMap.put("size", file.getSize());
                    fileMap.put("mimeType", file.getMimeType());
                    fileMap.put("createdAt", file.getCreatedAt());
                    fileMap.put("updatedAt", file.getUpdatedAt());
                    return fileMap;
                })
                .toList();
        
        log.info("📄 Found {} files", files.size());
        
        return FolderResponse.builder()
                .id(folder.getId())
                .name(folder.getName())
                .isFolder(true)  // ✅ ADD THIS
                .mimeType("folder")  // ✅ ADD THIS
                .parentId(folder.getParent() != null ? folder.getParent().getId() : null)
                .permission(share.getPermission())
                .sharedBy(share.getSharedBy().getFullName())
                .sharedAt(share.getCreatedAt())
                .subfolders(subfolders)
                .files(files)
                .itemCount(subfolders.size() + files.size())
                .createdAt(folder.getCreatedAt())
                .updatedAt(folder.getUpdatedAt())
                .build();
    }

    private boolean isSubfolderOf(Folder subfolder, Folder potentialParent) {
        Folder current = subfolder;
        int depth = 0;
        
        while (current != null && depth < 100) {
            if (current.getId().equals(potentialParent.getId())) {
                return true;
            }
            current = current.getParent();
            depth++;
        }
        
        return false;
    }

    private int countFolderItems(Folder folder) {
        int subfolderCount = folderRepository.countByParentAndIsDeleted(folder, false);
        int fileCount = fileRepository.countByFolderAndIsDeleted(folder, false);
        return subfolderCount + fileCount;
    }

    private void markAsDeleted(Folder folder, User deletedBy) {
        folder.setIsDeleted(true);
        folder.setDeletedAt(LocalDateTime.now());
        folder.setDeletedBy(deletedBy);
        folderRepository.save(folder);

        List<Folder> subfolders = folderRepository.findByParentAndIsDeleted(folder, false);
        for (Folder subfolder : subfolders) {
            markAsDeleted(subfolder, deletedBy);
        }
        
        List<File> files = fileRepository.findByFolderAndIsDeleted(folder, false);
        for (File file : files) {
            file.setIsDeleted(true);
            file.setDeletedAt(LocalDateTime.now());
            file.setDeletedBy(deletedBy);
            fileRepository.save(file);
        }
    }


}