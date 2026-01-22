package com.cloudstorage.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

public class DotenvConfig implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment environment = applicationContext.getEnvironment();
        
        Dotenv dotenv = Dotenv.configure()
                .ignoreIfMissing() // Don't fail if .env is missing (for production)
                .load();

        Map<String, Object> dotenvMap = new HashMap<>();
        dotenv.entries().forEach(entry -> 
            dotenvMap.put(entry.getKey(), entry.getValue())
        );

        environment.getPropertySources()
                .addFirst(new MapPropertySource("dotenvProperties", dotenvMap));
    }
}