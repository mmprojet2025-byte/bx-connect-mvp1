package com.bxjeunes.bx_connect.config;

import jakarta.servlet.MultipartConfigElement;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.web.servlet.MultipartAutoConfiguration;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class ImageUploadLimitsTest {
    @ParameterizedTest
    @ValueSource(strings = {"dev", "prod"})
    void imageLimitIsAvailableWithoutUploadProfile(String profile) {
        new WebApplicationContextRunner()
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withPropertyValues("spring.profiles.active=" + profile,
                        "spring.config.location=classpath:/application.properties")
                .withConfiguration(AutoConfigurations.of(MultipartAutoConfiguration.class))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    var limits = context.getBean(MultipartConfigElement.class);
                    assertThat(limits.getMaxFileSize()).isEqualTo(5L * 1024 * 1024);
                    assertThat(limits.getMaxRequestSize()).isEqualTo(10L * 1024 * 1024);
                });
    }
}
