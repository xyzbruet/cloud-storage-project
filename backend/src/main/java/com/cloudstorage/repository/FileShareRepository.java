package com.cloudstorage.repository;

import com.cloudstorage.model.File;
import com.cloudstorage.model.FileShare;
import com.cloudstorage.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileShareRepository extends JpaRepository<FileShare, Long> {

    // ================= BASIC QUERIES =================

    List<FileShare> findBySharedWithAndIsActive(User user, Boolean isActive);

    List<FileShare> findByFileAndIsActive(File file, Boolean isActive);

    List<FileShare> findBySharedByAndIsActive(User user, Boolean isActive);

    Optional<FileShare> findByFileAndSharedWith(File file, User user);

    Optional<FileShare> findByShareToken(String shareToken);

    Optional<FileShare> findByShareTokenAndIsActive(String shareToken, Boolean isActive);

    // ================= EXISTENCE CHECKS =================

    boolean existsByFileAndSharedWithAndIsActive(File file, User user, Boolean isActive);

    boolean existsByFileAndIsActive(File file, Boolean isActive);

    // ================= DELETE =================

    void deleteByFileAndSharedWith(File file, User user);

    void deleteByFile(File file);

    void deleteBySharedBy(User user);

    void deleteByFileId(Long fileId);

    // ================= COUNT =================

    @Query("SELECT COUNT(fs) FROM FileShare fs WHERE fs.file = :file AND fs.isActive = true AND fs.sharedWith IS NOT NULL")
    Long countPeopleWithAccess(@Param("file") File file);

    @Query("SELECT COUNT(DISTINCT fs.file) FROM FileShare fs WHERE fs.sharedBy = :user AND fs.isActive = true")
    Long countFilesSharedByUser(@Param("user") User user);

    // ================= ADVANCED =================

    @Query("SELECT fs FROM FileShare fs WHERE fs.sharedBy = :user AND fs.shareToken IS NOT NULL AND fs.sharedWith IS NULL AND fs.isActive = true")
    List<FileShare> findPublicShareLinksByUser(@Param("user") User user);

    @Query("SELECT fs FROM FileShare fs WHERE fs.file = :file AND fs.sharedWith IS NOT NULL AND fs.isActive = true")
    List<FileShare> findUserSharesForFile(@Param("file") File file);

    @Query("SELECT fs FROM FileShare fs WHERE fs.sharedWith = :user AND fs.permission = 'edit' AND fs.isActive = true")
    List<FileShare> findEditableFilesSharedWith(@Param("user") User user);

    @Query("SELECT CASE WHEN COUNT(fs) > 0 THEN true ELSE false END FROM FileShare fs WHERE fs.file = :file AND fs.shareToken IS NOT NULL AND fs.sharedWith IS NULL AND fs.isActive = true")
    boolean hasPublicShareLink(@Param("file") File file);

    Optional<FileShare> findByFile_IdAndSharedWithAndIsActive(
            Long fileId,
            User sharedWith,
            Boolean isActive
    );

    List<FileShare> findBySharedWith(User user);
}