package com.cloudstorage.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();
        
        log.info("🔍 JWT Filter: {} {} - Authorization Header: {}", 
            method, path, request.getHeader("Authorization") != null ? "Present ✅" : "Missing ❌");
        
        // Skip JWT validation for public endpoints
        if (isPublicEndpoint(path)) {
            log.info("🔓 Public endpoint - skipping JWT validation: {}", path);
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {
                log.info("🔑 JWT token found, validating...");
                
                if (tokenProvider.validateToken(jwt)) {
                    String email = tokenProvider.getEmailFromToken(jwt);
                    log.info("✅ JWT valid for user: {}", email);

                    if (email != null && 
                        SecurityContextHolder.getContext().getAuthentication() == null) {

                        UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails,
                                        null,
                                        userDetails.getAuthorities()
                                );

                        authentication.setDetails(
                                new WebAuthenticationDetailsSource().buildDetails(request)
                        );

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        log.info("✅ JWT authenticated user: {}", email);
                    }
                } else {
                    log.warn("❌ JWT validation failed for: {}", path);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"error\": \"Invalid or expired token\"}");
                    return;
                }
            } else {
                log.warn("⚠️ No JWT token found for protected endpoint: {}", path);
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("{\"error\": \"No authentication token provided\"}");
                return;
            }
        } catch (Exception ex) {
            log.error("❌ JWT authentication failed for {}: {}", path, ex.getMessage(), ex);
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\": \"Authentication failed\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Determines if an endpoint is public (doesn't require JWT)
     */
    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/api/auth/login") ||
               path.startsWith("/api/auth/register") ||
               path.startsWith("/api/health") ||
               path.startsWith("/actuator/health") ||
               path.startsWith("/api/folders/shared-link/") ||
               path.startsWith("/api/files/shared-link/") ||
               path.startsWith("/api/files/s/") ||
               path.startsWith("/s/") ||                    // ✅ FIX: Short URL format
               path.startsWith("/uploads/") ||
               path.equals("/") ||
               path.equals("/error");
    }

    /**
     * Extracts JWT token from Authorization header
     * Expected format: "Bearer <token>"
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            String token = bearerToken.substring(7);
            log.debug("JWT token extracted from Authorization header (length: {})", token.length());
            return token;
        }
        
        log.debug("No Bearer token found in Authorization header");
        return null;
    }
}