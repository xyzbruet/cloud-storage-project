package com.cloudstorage.repository;

import com.cloudstorage.model.File;
import com.cloudstorage.model.Folder;
import com.cloudstorage.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {

    // ================= BASIC LISTING =================
    List<File> findByUserAndIsDeleted(User user, boolean isDeleted);

    List<File> findByUserAndFolderIsNullAndIsDeleted(User user, boolean isDeleted);

    List<File> findByUserAndFolderAndIsDeleted(User user, Folder folder, boolean isDeleted);

    // ================= STAR & SEARCH =================
    List<File> findByUserAndIsStarredAndIsDeleted(
            User user,
            boolean isStarred,
            boolean isDeleted
    );

    List<File> findByUserAndNameContainingIgnoreCaseAndIsDeleted(
            User user,
            String name,
            boolean isDeleted
    );

    // ================= DASHBOARD =================
    long countByUserAndIsDeleted(User user, boolean isDeleted);

    long countByUserAndIsStarredAndIsDeleted(
            User user,
            boolean isStarred,
            boolean isDeleted
    );

    List<File> findTop5ByUserAndIsDeletedOrderByCreatedAtDesc(
            User user,
            boolean isDeleted
    );

     
    // ✅ Add this method - find all files in a folder regardless of owner
    List<File> findByFolderAndIsDeleted(Folder folder, Boolean isDeleted);
    
    void deleteByFolderId(Long folderId);

// List<File> findByFolderAndIsDeleted(Folder folder, Boolean isDeleted);
int countByFolderAndIsDeleted(Folder folder, Boolean isDeleted);

}
