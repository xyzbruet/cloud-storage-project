package com.cloudstorage.service;

import com.cloudstorage.dto.response.DashboardResponse;
import com.cloudstorage.model.User;
import com.cloudstorage.repository.FileRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        User user = getCurrentUser();

        return DashboardResponse.builder()
                .totalFiles(fileRepository.countByUserAndIsDeleted(user, false))
                .folders(folderRepository.countByUserAndIsDeleted(user, false))
                .starred(fileRepository.countByUserAndIsStarredAndIsDeleted(user, true, false))
                .recentFiles(
                        fileRepository.findTop5ByUserAndIsDeletedOrderByCreatedAtDesc(user, false)
                )
                .build();
    }
}
