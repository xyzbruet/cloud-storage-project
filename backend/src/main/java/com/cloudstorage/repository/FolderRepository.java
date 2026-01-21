package com.cloudstorage.repository;

import com.cloudstorage.model.Folder;
import com.cloudstorage.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    
    List<Folder> findByUserAndParentIsNullAndIsDeleted(User user, Boolean isDeleted);
    
    List<Folder> findByUserAndParentAndIsDeleted(User user, Folder parent, Boolean isDeleted);
    
    List<Folder> findByUserAndIsDeleted(User user, Boolean isDeleted);
    
    List<Folder> findByParentAndIsDeleted(Folder parent, Boolean isDeleted);
    
    List<Folder> findByParent(Folder parent);

    long countByUserAndIsDeleted(User user, boolean isDeleted);
    
   // List<Folder> findByParentAndIsDeleted(Folder parent, Boolean isDeleted);

     int countByParentAndIsDeleted(Folder parent, Boolean isDeleted);

}