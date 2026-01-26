package com.cloudstorage.config;

import com.cloudstorage.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1️⃣ CORS - must be first
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // 2️⃣ CSRF
            .csrf(csrf -> csrf.disable())

            // 3️⃣ Session management
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // 4️⃣ Authorization rules - ORDER MATTERS! More specific patterns first
            .authorizeHttpRequests(auth -> auth
                // ✅ OPTIONS requests - must come first for CORS preflight
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                
                // ✅ Public share links - no authentication needed
                .requestMatchers("/s/**").permitAll()                    // All public share links
                .requestMatchers("/api/files/s/**").permitAll()          // File share links
                .requestMatchers("/api/folders/s/**").permitAll()        // Folder share links
                .requestMatchers("/uploads/**").permitAll()              // Static uploads
                
                // ✅ Public auth endpoints
                .requestMatchers(
                    "/",
                    "/api/health",
                    "/actuator/health",
                    "/error",
                    "/api/auth/login",
                    "/api/auth/register",
                    "/api/auth/google-login"     // ✅ NEW: Google OAuth endpoint
                ).permitAll()

                // ✅ Protected endpoints - require authentication
                .requestMatchers(
                    "/api/auth/me",
                    "/api/user/**",
                    "/api/files/**",
                    "/api/folders/**",
                    "/api/dashboard/**"
                ).authenticated()

                // ✅ All other requests require authentication
                .anyRequest().authenticated()
            )

            // 5️⃣ JWT filter - added AFTER auth rules are defined
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allowed origins
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "https://cloud-storage-project-tau.vercel.app",
            "https://yourdomain.com"  // Add your production domain
        ));

        // Allowed methods
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
        ));

        // Allowed headers
        configuration.setAllowedHeaders(List.of("*"));
        
        // Allow credentials
        configuration.setAllowCredentials(true);
        
        // Max age for preflight cache
        configuration.setMaxAge(3600L);

        // Exposed headers
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Content-Disposition"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}