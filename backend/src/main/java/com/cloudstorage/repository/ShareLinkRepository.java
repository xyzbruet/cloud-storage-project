package com.cloudstorage.repository;

import com.cloudstorage.model.ShareLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShareLinkRepository extends JpaRepository<ShareLink, Long> {
    
    Optional<ShareLink> findByToken(String token);
    
    ShareLink findByFileIdAndIsActiveTrue(Long fileId);
    
    ShareLink findByFolderIdAndIsActiveTrue(Long folderId);
    
    void deleteByFileId(Long fileId);
    
    void deleteByFolderId(Long folderId);
}