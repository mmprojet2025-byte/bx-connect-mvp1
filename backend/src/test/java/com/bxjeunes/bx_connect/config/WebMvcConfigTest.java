package com.bxjeunes.bx_connect.config;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WebMvcConfigTest {

    @Test
    void relativeUploadDirectoryIsResolvedFromUserDir() {
        String expectedLocation = Path.of(System.getProperty("user.dir"))
                .toUri().toASCIIString();
        if (!expectedLocation.endsWith("/")) {
            expectedLocation += "/";
        }

        assertResourceLocation("uploads/../public images", expectedLocation + "public%20images/");
    }

    @Test
    void absoluteUploadDirectoryIsPreserved() {
        assertResourceLocation("/data/temporary/../public images", "file:///data/public%20images/");
    }

    private void assertResourceLocation(String uploadDir, String expectedLocation) {
        WebMvcConfig config = new WebMvcConfig(mock(RateLimitInterceptor.class));
        ReflectionTestUtils.setField(config, "uploadDir", uploadDir);
        ResourceHandlerRegistry registry = mock(ResourceHandlerRegistry.class);
        ResourceHandlerRegistration registration = mock(ResourceHandlerRegistration.class);
        when(registry.addResourceHandler("/uploads/**")).thenReturn(registration);

        config.addResourceHandlers(registry);

        verify(registration).addResourceLocations(expectedLocation);
    }
}
