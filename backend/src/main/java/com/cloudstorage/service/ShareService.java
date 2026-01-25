package com.cloudstorage.service;

import java.util.Optional;
import com.cloudstorage.dto.response.SharedByMeResponse;
import com.cloudstorage.dto.response.ShareDetailDTO;
import java.time.LocalDateTime;
import com.cloudstorage.dto.response.FileResponse;
import com.cloudstorage.dto.request.ShareRequest;
import com.cloudstorage.dto.response.ShareLinkResponse;
import com.cloudstorage.dto.response.SharedFileResponse;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.exception.UnauthorizedException;
import com.cloudstorage.model.File;
import com.cloudstorage.model.FileShare;
import com.cloudstorage.model.User;
import com.cloudstorage.repository.FileRepository;
import com.cloudstorage.repository.FileShareRepository;
import com.cloudstorage.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.cloudstorage.dto.response.OwnerDTO;
import jakarta.annotation.PostConstruct;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;


@RequiredArgsConstructor
@Service
@Slf4j
public class ShareService {

    private final FileShareRepository fileShareRepository;
    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.url:https://cloud-storage-project-tau.vercel.app}")
    private String appUrl;

    @Value("${app.frontend-url:https://cloud-storage-project-tau.vercel.app}")
    private String frontendUrl;

    private String getFrontendUrl() {
        // ✅ Always use frontend URL
        if (frontendUrl == null || frontendUrl.trim().isEmpty() || frontendUrl.equals("${app.frontend-url}")) {
            // Fallback if not set
            return appUrl;
        }
        log.info("✅ Using frontend URL: {}", frontendUrl);
        return frontendUrl.trim();
    }
    
    @PostConstruct
    public void logConfig() {
        log.info("=== SHARE SERVICE CONFIG ===");
        log.info("app.url = {}", appUrl);
        log.info("app.frontend-url = {}", frontendUrl);
        log.info("getFrontendUrl() = {}", getFrontendUrl());
        log.info("===========================");
    }

    private User getCurrentUser() {
        String email = org.springframework.security.core.context.SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public FileShare shareFileWithUser(Long fileId, ShareRequest request, User currentUser) {
        // Get the file
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        // Check if current user owns the file
        if (!file.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to share this file");
        }

        // Find user to share with
        User shareWithUser = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User with email " + request.getEmail() + " not found"));

        // Check if trying to share with self
        if (shareWithUser.getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("You cannot share a file with yourself");
        }

        // Check if already shared
        Optional<FileShare> existingShare = fileShareRepository.findByFileAndSharedWith(file, shareWithUser);
        
        FileShare fileShare;
        if (existingShare.isPresent()) {
            // Update existing share
            fileShare = existingShare.get();
            fileShare.setPermission(request.getPermission());
            fileShare.setIsActive(true);
        } else {
            // Create new share
            fileShare = FileShare.builder()
                    .file(file)
                    .sharedWith(shareWithUser)
                    .sharedBy(currentUser)
                    .permission(request.getPermission())
                    .isActive(true)
                    .build();
        }

        FileShare savedShare = fileShareRepository.save(fileShare);

        // 🔍 DEBUG LOG
        log.info("FILE SHARE REQUEST → email={}, permission={}, sendEmail={}",
                request.getEmail(),
                request.getPermission(),
                request.getSendEmail()
        );

        // Send email notification only if requested - Using enhanced HTML template
        if (Boolean.TRUE.equals(request.getSendEmail())) {
            log.info("EMAIL CONDITION PASSED → Sending email to {}", shareWithUser.getEmail());

            String downloadLink = getFrontendUrl() + "/shared-with-me";
            
            emailService.sendFileShareEmail(
                    shareWithUser.getEmail(),           // recipient email
                    shareWithUser.getFullName(),        // recipient name
                    currentUser.getFullName(),          // shared by username
                    currentUser.getEmail(),             // shared by email
                    file.getName(),                     // file name
                    request.getPermission().equals("edit") ? "Can edit" : "View only", // permission
                    downloadLink                        // download/access link
            );
        } else {
            log.warn("EMAIL NOT SENT → sendEmail flag is {}", request.getSendEmail());
        }

        return savedShare;
    }

    @Transactional(readOnly = true)
    public List<FileShare> getFileShares(Long fileId, User currentUser) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        // Check if current user owns the file
        if (!file.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to view shares for this file");
        }

        return fileShareRepository.findByFileAndIsActive(file, true);
    }

    @Transactional(readOnly = true)
    public List<SharedFileResponse> getFilesSharedWithMe(User currentUser) {

        List<FileShare> shares =
                fileShareRepository.findBySharedWithAndIsActive(currentUser, true);

        return shares.stream()
            .map(share -> SharedFileResponse.builder()
                .id(share.getFile().getId())            // fileId
                .shareId(share.getId())                 // ⭐ CRITICAL
                .name(share.getFile().getName())
                .size(share.getFile().getSize())
                .mimeType(share.getFile().getMimeType())
                .isStarred(share.getIsStarred())        // ⭐ per-user star
                .ownerEmail(share.getFile().getUser().getEmail())
                .permission(share.getPermission())
                .sharedAt(share.getCreatedAt())
                .createdAt(share.getFile().getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    @Transactional
    public ShareLinkResponse generateShareLink(Long fileId, User currentUser) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        // Check if current user owns the file
        if (!file.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to generate share link for this file");
        }

        // Check if share link already exists
        List<FileShare> existingShares = fileShareRepository.findByFileAndIsActive(file, true);
        for (FileShare share : existingShares) {
            if (share.getShareToken() != null && share.getSharedWith() == null) {
                // Public share link already exists
                String shareUrl = getFrontendUrl() + "/s/" + share.getShareToken();
                return ShareLinkResponse.builder()
                        .shareUrl(shareUrl)
                        .token(share.getShareToken())
                        .build();
            }
        }

        // Generate new token
        String token = UUID.randomUUID().toString().replace("-", "");

        // Create public share (no specific user)
        FileShare publicShare = FileShare.builder()
                .file(file)
                .sharedBy(currentUser)
                .shareToken(token)
                .permission("view")
                .isActive(true)
                .build();

        fileShareRepository.save(publicShare);

        String shareUrl = getFrontendUrl() + "/s/" + token;
        
        return ShareLinkResponse.builder()
                .shareUrl(shareUrl)
                .token(token)
                .build();
    }

    @Transactional(readOnly = true)
    public ShareLinkResponse getExistingShareLink(Long fileId, User currentUser) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!file.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to view share link for this file");
        }

        List<FileShare> shares = fileShareRepository.findByFileAndIsActive(file, true);
        
        for (FileShare share : shares) {
            if (share.getShareToken() != null && share.getSharedWith() == null) {
                String shareUrl = getFrontendUrl() + "/s/" + share.getShareToken();
                return ShareLinkResponse.builder()
                        .shareUrl(shareUrl)
                        .token(share.getShareToken())
                        .build();
            }
        }

        return null;
    }

    @Transactional
    public void revokeShareLink(Long fileId, User currentUser) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!file.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to revoke share link for this file");
        }

        List<FileShare> shares = fileShareRepository.findByFileAndIsActive(file, true);
        
        for (FileShare share : shares) {
            if (share.getShareToken() != null && share.getSharedWith() == null) {
                share.setIsActive(false);
                fileShareRepository.save(share);
            }
        }
    }

    @Transactional
    public void updatePermission(Long shareId, String permission, User currentUser) {
        FileShare share = fileShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));

        // Check if current user owns the file
        if (!share.getFile().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to update this share");
        }

        share.setPermission(permission);
        fileShareRepository.save(share);
    }

    @Transactional
    public void removeUserAccess(Long shareId, User currentUser) {
        FileShare share = fileShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));

        // Check if current user owns the file
        if (!share.getFile().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to remove this share");
        }

        share.setIsActive(false);
        fileShareRepository.save(share);
    }

    @Transactional(readOnly = true)
    public File getFileByShareToken(String token) {
        FileShare share = fileShareRepository.findByShareTokenAndIsActive(token, true)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired share link"));

        return share.getFile();
    }

    // ==========================================
    // GET FILES SHARED BY ME (UPDATED WITH OWNER)
    // ============================================
    @Transactional(readOnly = true)
    public List<SharedByMeResponse> getFilesSharedByMe(User currentUser) {
        // Get all files owned by current user that have active shares
        List<FileShare> shares = fileShareRepository.findBySharedByAndIsActive(currentUser, true);
        
        // Group shares by file
        Map<Long, List<FileShare>> sharesByFile = shares.stream()
                .collect(Collectors.groupingBy(share -> share.getFile().getId()));
        
        return sharesByFile.entrySet().stream()
                .map(entry -> {
                    File file = shares.stream()
                            .filter(s -> s.getFile().getId().equals(entry.getKey()))
                            .findFirst()
                            .get()
                            .getFile();
                    
                    // Build owner DTO
                    OwnerDTO ownerDTO = OwnerDTO.builder()
                            .id(file.getUser().getId())
                            .name(file.getUser().getFullName())
                            .email(file.getUser().getEmail())
                            .build();
                    
                    List<ShareDetailDTO> sharedWith = entry.getValue().stream()
                            .filter(share -> share.getSharedWith() != null)
                            .map(share -> ShareDetailDTO.builder()
                                    .shareId(share.getId())
                                    .email(share.getSharedWith().getEmail())
                                    .name(share.getSharedWith().getFullName())
                                    .permission(share.getPermission())
                                    .sharedAt(share.getCreatedAt())
                                    .build())
                            .collect(Collectors.toList());
                    
                    // Check if has public link
                    boolean hasPublicLink = entry.getValue().stream()
                            .anyMatch(share -> share.getShareToken() != null && 
                                             share.getSharedWith() == null);
                    
                    String publicLink = null;
                    if (hasPublicLink) {
                        publicLink = entry.getValue().stream()
                                .filter(share -> share.getShareToken() != null && 
                                               share.getSharedWith() == null)
                                .findFirst()
                                .map(share -> getFrontendUrl() + "/s/" + share.getShareToken())
                                .orElse(null);
                    }
                    
                    return SharedByMeResponse.builder()
                            .id(file.getId())
                            .name(file.getName())
                            .size(file.getSize())
                            .mimeType(file.getMimeType())
                            .isStarred(Boolean.TRUE.equals(file.getIsStarred()))
                            .isFolder("folder".equals(file.getMimeType()))
                            .owner(ownerDTO)
                            .sharedWithCount(sharedWith.size())
                            .sharedWith(sharedWith)
                            .hasPublicLink(hasPublicLink)
                            .publicLink(publicLink)
                            .createdAt(file.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // =========================================
    // REMOVE ALL ACCESS WITH SOFT DELETE
    // ============================================
    @Transactional
    public void removeAllAccessToFile(Long fileId, User currentUser) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        // Only owner can remove all access
        if (!file.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException(
                "You don't have permission to remove all access to this file"
            );
        }

        // 1. Get all active shares
        List<FileShare> shares = fileShareRepository.findByFileAndIsActive(file, true);
        
        // 2. Deactivate shares (no email notifications for bulk removal)
        for (FileShare share : shares) {
            share.setIsActive(false);
            fileShareRepository.save(share);
        }
        
        // 3. Soft delete the file
        file.setIsDeleted(true);
        file.setDeletedAt(LocalDateTime.now());
        file.setDeletedBy(currentUser);
        fileRepository.save(file);
        
        log.info("All access removed and file soft-deleted: {}", fileId);
    }

    // ============================================
    // COMPLETE toggleStarForSharedFile METHOD
    // ============================================
    @Transactional
    public void toggleStarForSharedFile(Long fileId, User user) {

        FileShare share = fileShareRepository
            .findByFile_IdAndSharedWithAndIsActive(fileId, user, true)
            .orElseThrow(() -> new RuntimeException("Shared file not found"));

        share.setIsStarred(!Boolean.TRUE.equals(share.getIsStarred()));
        fileShareRepository.save(share);
    }

    @Transactional
    public void removeFromMyDrive(Long shareId) {
        User currentUser = getCurrentUser();

        FileShare share = fileShareRepository.findById(shareId)
            .orElseThrow(() -> new RuntimeException("Share not found"));

        // User can only remove their own access
        if (!share.getSharedWith().getId().equals(currentUser.getId())) {
            throw new RuntimeException("You cannot remove this share");
        }

        share.setIsActive(false);
        fileShareRepository.save(share);
    }

    /**
     * Remove current user's access to a shared file
     * This allows users to remove files from their "Shared with me" view
     */
    @Transactional
    public void removeSelfFromSharedFile(Long fileId, User currentUser) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        // Find the share record for this user
        Optional<FileShare> shareOptional = fileShareRepository.findByFileAndSharedWith(file, currentUser);
        
        if (shareOptional.isEmpty()) {
            throw new ResourceNotFoundException("You don't have access to this file");
        }

        FileShare share = shareOptional.get();
        
        // Deactivate the share
        share.setIsActive(false);
        fileShareRepository.save(share);
        
        log.info("User {} removed themselves from file {}", currentUser.getEmail(), fileId);
    }

    /**
     * Get shared file details (metadata only)
     * Used by frontend to display file info
     */
    @Transactional(readOnly = true)
    public FileResponse getSharedFileDetails(String token) {
        log.info("🔍 Getting file details for share token: {}", token);
        
        FileShare share = fileShareRepository
                .findByShareTokenAndIsActive(token, true)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Invalid or expired share link"));

        File file = share.getFile();
        
        // Eagerly access properties to avoid lazy loading issues
        FileResponse response = FileResponse.builder()
                .id(file.getId())
                .name(file.getName())
                .size(file.getSize())
                .mimeType(file.getMimeType())
                .isStarred(false) // public users can't star
                .createdAt(file.getCreatedAt())
                .build();
        
        log.info("✅ File details retrieved: {}", file.getName());
        return response;
    }

    /**
     * Get shared file for download (includes file data)
     * CRITICAL: Must be @Transactional to maintain DB session for lazy loading
     */
    @Transactional(readOnly = true)
    public File getSharedFileForDownload(String token) {
        log.info("📥 Getting file for download, share token: {}", token);
        
        FileShare share = fileShareRepository
                .findByShareTokenAndIsActive(token, true)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Invalid or expired share link"));

        File file = share.getFile();
        
        // CRITICAL: Eagerly load ALL properties including file data
        // This must happen INSIDE the transaction to avoid lazy loading errors
        Long fileId = file.getId();
        String fileName = file.getName();
        String mimeType = file.getMimeType();
        Long fileSize = file.getSize();
        byte[] fileData = file.getFileData(); // Force load the lazy property
        
        // Validate file data
        if (fileData == null || fileData.length == 0) {
            log.error("❌ File data is null or empty for file ID: {}", fileId);
            throw new RuntimeException("File data not found in database");
        }
        
        log.info("✅ File loaded: {} ({} bytes)", fileName, fileData.length);
        
        return file;
    }
}