package com.cloudstorage;

import com.cloudstorage.config.SecurityConfig;
import com.cloudstorage.config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(
    classes = BackendApplication.class,
    properties = {
        "google.client.id=",
        "jwt.secret=test-jwt-secret",
        "APP_BASE_URL=http://localhost:8080",
        "APP_FRONTEND_URL=http://localhost:3000"
    }
)
@Import(TestSecurityConfig.class)
@ImportAutoConfiguration(
    exclude = {
        SecurityConfig.class,
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class
    }
)
class BackendApplicationTests {

    @Test
    void contextLoads() {
        // context startup test only
    }
}
