package com.cloudstorage;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.cloudstorage.repository")
public class BackendApplication {

    public static void main(String[] args) {
        // Load environment variables from .env file before Spring Boot starts
        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory("./")
                    .ignoreIfMissing()
                    .load();
            
            dotenv.entries().forEach(entry -> 
                System.setProperty(entry.getKey(), entry.getValue())
            );
            
            System.out.println("✅ Environment variables loaded from .env file");
        } catch (Exception e) {
            System.out.println("⚠️ No .env file found, using system environment variables");
        }

        SpringApplication.run(BackendApplication.class, args);
    }
}