package com.cloudstorage.repository;

import com.cloudstorage.model.Folder;
import com.cloudstorage.model.FolderShare;
import com.cloudstorage.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderShareRepository extends JpaRepository<FolderShare, Long> {
    
    Optional<FolderShare> findByFolderAndSharedWith(Folder folder, User sharedWith);
    
    Optional<FolderShare> findByFolderAndShareTokenIsNotNullAndIsActiveTrue(Folder folder);
    
     Optional<FolderShare> findByShareTokenAndIsActiveTrue(String shareToken);

    List<FolderShare> findByFolderAndIsActiveTrue(Folder folder);
    
    List<FolderShare> findBySharedWithAndIsActive(User sharedWith, Boolean isActive);
    
    List<FolderShare> findBySharedByAndIsActive(User sharedBy, Boolean isActive);

    void deleteByFolderId(Long folderId);
}