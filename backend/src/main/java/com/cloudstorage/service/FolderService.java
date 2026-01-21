package com.cloudstorage.service;

import com.cloudstorage.repository.FileRepository;
import com.cloudstorage.repository.FolderShareRepository;
import com.cloudstorage.repository.ShareLinkRepository;
import com.cloudstorage.dto.request.CreateFolderRequest;
import com.cloudstorage.dto.response.FolderResponse;
import com.cloudstorage.model.Folder;
import com.cloudstorage.model.User;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.cloudstorage.model.File;
import com.cloudstorage.repository.FileShareRepository;
import lombok.extern.slf4j.Slf4j;
import com.cloudstorage.dto.response.OwnerDTO;
import java.time.LocalDateTime;


import java.util.List;


@Service
@RequiredArgsConstructor
@Slf4j
public class FolderService {

    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final FolderShareService folderShareService;
    private final FileRepository fileRepository;
private final FolderShareRepository folderShareRepository;
private final ShareLinkRepository shareLinkRepository;
private final FileShareRepository fileShareRepository;


    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<Folder> getRootFolders() {
        User user = getCurrentUser();
        return folderRepository.findByUserAndParentIsNullAndIsDeleted(user, false);
    }

    @Transactional(readOnly = true)
    public List<Folder> getSubFolders(Long parentId) {
        User user = getCurrentUser();
        Folder parent = folderRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Parent folder not found"));
        
        // Check if user has access to parent folder
        if (!parent.getUser().getId().equals(user.getId())) {
            // Not the owner, check shared access
            String permission = folderShareService.getUserFolderPermission(parentId, user);
            if (permission == null) {
                throw new RuntimeException("Unauthorized: You don't have access to this folder");
            }
        }
        
        // Return all subfolders (not filtered by user ownership)
        return folderRepository.findByParentAndIsDeleted(parent, false);
    }

   // ================ CREATE FOLDER (UPDATED FOR EDIT PERMISSION) =================
@Transactional
public Folder createFolder(String name, Long parentId) {
    User user = getCurrentUser();

    Folder parent = null;
    if (parentId != null) {
        parent = folderRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Parent folder not found"));
        
        // Verify user has edit permission for parent folder
        if (!parent.getUser().getId().equals(user.getId())) {
            // Not the owner, check if they have edit permission
            if (!folderShareService.canEditFolder(parentId, user)) {
                throw new RuntimeException(
                    "Unauthorized: You need edit permission to create folders here"
                );
            }
        }
    }

    Folder folder = Folder.builder()
            .name(name)
            .parent(parent)
            .user(user) // Creator becomes the folder owner
            .isDeleted(false)
            .build();

    return folderRepository.save(folder);
}


    @Transactional
    public Folder renameFolder(Long folderId, String newName) {
        User user = getCurrentUser();
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        // Check if user has edit permission
        if (!folder.getUser().getId().equals(user.getId())) {
            if (!folderShareService.canEditFolder(folderId, user)) {
                throw new RuntimeException("Unauthorized: You need edit permission to rename this folder");
            }
        }

        folder.setName(newName);
        return folderRepository.save(folder);
    }


// ================= SOFT DELETE (UPDATED) =================
@Transactional
public void moveToTrash(Long folderId) {
    User user = getCurrentUser();
    Folder folder = folderRepository.findById(folderId)
            .orElseThrow(() -> new RuntimeException("Folder not found"));

    // Check if user has permission to delete
    boolean canDelete = false;
    
    // 1. Owner can always delete
    if (folder.getUser().getId().equals(user.getId())) {
        canDelete = true;
    }
    // 2. User with edit permission can delete
    else if (folderShareService.canEditFolder(folderId, user)) {
        canDelete = true;
    }
    
    if (!canDelete) {
        throw new RuntimeException(
            "Unauthorized: You don't have permission to delete this folder"
        );
    }

    // Soft delete folder and all subfolders
    markAsDeleted(folder, user);
}


   

// ================= MARK AS DELETED (UPDATED WITH USER TRACKING) =================
private void markAsDeleted(Folder folder, User deletedBy) {
    folder.setIsDeleted(true);
    folder.setDeletedAt(LocalDateTime.now());
    folder.setDeletedBy(deletedBy);
    folderRepository.save(folder);

    // Recursively delete subfolders
    List<Folder> subfolders = folderRepository.findByParentAndIsDeleted(folder, false);
    for (Folder subfolder : subfolders) {
        markAsDeleted(subfolder, deletedBy);
    }
    
    // Soft delete all files in folder
    List<File> files = fileRepository.findByFolderAndIsDeleted(folder, false);
    for (File file : files) {
        file.setIsDeleted(true);
        file.setDeletedAt(LocalDateTime.now());
        file.setDeletedBy(deletedBy);
        fileRepository.save(file);
    }
}

    @Transactional
    public FolderResponse restoreFromTrash(Long folderId) {
        User user = getCurrentUser();
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));

        if (!folder.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        if (!folder.getIsDeleted()) {
            throw new RuntimeException("Folder is not in trash");
        }

        folder.setIsDeleted(false);
        folderRepository.save(folder);

        return toResponse(folder);
    }

    public List<Folder> getTrashFolders() {
        User user = getCurrentUser();
        return folderRepository.findByUserAndIsDeleted(user, true);
    }

 

// ============== PERMANENT DELETE (UPDATED) =================
@Transactional
public void permanentlyDelete(Long folderId) {
    User user = getCurrentUser();
    Folder folder = folderRepository.findById(folderId)
            .orElseThrow(() -> new RuntimeException("Folder not found"));

    // Only owner can permanently delete
    if (!folder.getUser().getId().equals(user.getId())) {
        throw new RuntimeException(
            "Unauthorized: Only the owner can permanently delete this folder"
        );
    }

    // Must be in trash first
    if (!Boolean.TRUE.equals(folder.getIsDeleted())) {
        throw new RuntimeException("Folder must be in trash before permanent delete");
    }

    permanentlyDeleteRecursive(folder);
}

// ================= PERMANENT DELETE RECURSIVE (SAME AS BEFORE) =================
private void permanentlyDeleteRecursive(Folder folder) {
    // 1. Delete files (and their shares)
    List<File> files = fileRepository.findByFolderAndIsDeleted(folder, true);
    for (File file : files) {
        fileShareRepository.deleteByFileId(file.getId());
        fileRepository.delete(file);
    }

    // 2. Delete subfolders recursively
    List<Folder> subfolders = folderRepository.findByParent(folder);
    for (Folder subfolder : subfolders) {
        permanentlyDeleteRecursive(subfolder);
    }

    // 3. Delete folder shares
    folderShareRepository.deleteByFolderId(folder.getId());

    // 4. Delete share links
    shareLinkRepository.deleteByFolderId(folder.getId());

    // 5. Delete folder
    folderRepository.delete(folder);
}

    @Transactional(readOnly = true)
    public Folder getFolder(Long folderId) {
        User user = getCurrentUser();
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
        
        // Check if user has access
        if (!folder.getUser().getId().equals(user.getId())) {
            String permission = folderShareService.getUserFolderPermission(folderId, user);
            if (permission == null) {
                throw new RuntimeException("Unauthorized: You don't have access to this folder");
            }
        }
        
        return folder;
    }

  


// ================= DTO MAPPER (UPDATED WITH OWNER) =================
public FolderResponse toResponse(Folder f) {
    // Build owner DTO
    OwnerDTO ownerDTO = OwnerDTO.builder()
            .id(f.getUser().getId())
            .name(f.getUser().getFullName())
            .email(f.getUser().getEmail())
            .build();

    return FolderResponse.builder()
            .id(f.getId())
            .name(f.getName())
            .isFolder(true)
            .owner(ownerDTO)
            .parentId(f.getParent() != null ? f.getParent().getId() : null)
            .createdAt(f.getCreatedAt())
            .updatedAt(f.getUpdatedAt())
            .build();
}

    public FolderResponse create(CreateFolderRequest req) {
        Folder folder = createFolder(req.getName(), req.getParentId());
        return toResponse(folder);
    }

    public FolderResponse rename(Long id, String name) {
        return toResponse(renameFolder(id, name));
    }

    // ================= MOVE FOLDER =================
    @Transactional
    public FolderResponse moveFolder(Long folderId, Long newParentId, User currentUser) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
        
        if (!folder.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied - you don't own this folder");
        }
        
        if (folder.getIsDeleted()) {
            throw new RuntimeException("Cannot move deleted folder");
        }
        
        if (newParentId == null) {
            folder.setParent(null);
            folder.setUpdatedAt(java.time.LocalDateTime.now());
            return toResponse(folderRepository.save(folder));
        }
        
        Folder newParent = folderRepository.findById(newParentId)
                .orElseThrow(() -> new RuntimeException("Parent folder not found"));
        
        if (!newParent.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied - target folder doesn't belong to you");
        }
        
        if (newParent.getIsDeleted()) {
            throw new RuntimeException("Cannot move to a deleted folder");
        }
        
        if (isDescendant(folder, newParent)) {
            throw new RuntimeException("Cannot move folder into itself or its subfolder");
        }
        
        if (folder.getParent() != null && folder.getParent().getId().equals(newParentId)) {
            throw new RuntimeException("Folder is already in this location");
        }
        
        folder.setParent(newParent);
        folder.setUpdatedAt(java.time.LocalDateTime.now());
        return toResponse(folderRepository.save(folder));
    }

    private boolean isDescendant(Folder ancestor, Folder descendant) {
        if (descendant == null) return false;
        if (ancestor.getId().equals(descendant.getId())) return true;
        
        Folder current = descendant.getParent();
        while (current != null) {
            if (current.getId().equals(ancestor.getId())) return true;
            current = current.getParent();
        }
        return false;
    }

    public Folder getFolderById(Long id) {
        return folderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
    }
}