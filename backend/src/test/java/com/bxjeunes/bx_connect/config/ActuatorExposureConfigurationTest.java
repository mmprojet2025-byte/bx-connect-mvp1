package com.bxjeunes.bx_connect.config;

import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class ActuatorExposureConfigurationTest {

    @Test
    void actuatorPublicResteLimiteAHealthEtInfo() throws Exception {
        Properties properties = loadProperties("application.properties");

        assertThat(properties.getProperty("management.endpoints.web.exposure.include")).isEqualTo("health,info");
        assertThat(properties.getProperty("management.endpoint.health.show-details")).isEqualTo("never");
        assertThat(properties.stringPropertyNames())
                .noneMatch(name -> name.equals("management.endpoints.web.exposure.include")
                        && properties.getProperty(name).contains("env"));
        assertThat(properties.getProperty("management.endpoints.web.exposure.include"))
                .doesNotContain("beans", "metrics", "configprops", "env");
    }

    @Test
    void swaggerResteDesactiveEnProduction() throws Exception {
        Properties properties = loadProperties("application-prod.properties");

        assertThat(properties.getProperty("springdoc.api-docs.enabled")).isEqualTo("false");
        assertThat(properties.getProperty("springdoc.swagger-ui.enabled")).isEqualTo("false");
    }

    private Properties loadProperties(String resourceName) throws Exception {
        Properties properties = new Properties();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(resourceName)) {
            assertThat(input).as(resourceName).isNotNull();
            properties.load(input);
        }
        return properties;
    }
}
