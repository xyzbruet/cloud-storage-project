package com.cloudstorage.dto.response;

import lombok.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Standardized response for share link operations.
 * Used consistently across FileService, FolderShareService, and ShareService.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareLinkResponse {

    /**
     * The unique share token (UUID without dashes)
     */
    private String token;

    /**
     * The complete shareable URL
     * Format: {appUrl}/s/{token}
     * This is what frontend expects and displays to users
     */
    private String shareUrl;

    /**
     * Whether the share link is currently active
     * Default: true when created, false when revoked
     */
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Permission level for the share link
     * Typically "view" for public share links
     */
    private String permission;

    /**
     * Optional: When the link expires (if expiration is implemented)
     */
    private java.time.LocalDateTime expiresAt;

    /**
     * Factory method to create response with just URL and token
     * This is the most common use case
     */
    public static ShareLinkResponse of(String token, String shareUrl) {
        return ShareLinkResponse.builder()
                .token(token)
                .shareUrl(shareUrl)
                .isActive(true)
                .permission("view")
                .build();
    }
}