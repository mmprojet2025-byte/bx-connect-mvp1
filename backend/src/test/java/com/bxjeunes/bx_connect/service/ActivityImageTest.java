package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.controller.UploadController;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class ActivityImageTest {
    @TempDir Path folder;
    ActivityImageService images = new ActivityImageService();
    UploadController uploads = new UploadController();
    @BeforeEach void setup() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("ref@example.test", "unused", List.of(new SimpleGrantedAuthority("ROLE_REFERENT"))));
        ReflectionTestUtils.setField(images,"directory",folder.toString());
        ReflectionTestUtils.setField(images,"baseUrl","https://example.test/uploads");
        ReflectionTestUtils.setField(uploads,"uploadDir",folder.toString());
        ReflectionTestUtils.setField(uploads,"baseUrl","https://example.test/uploads");
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void validUploadAndAttachmentAndUrl() throws Exception {
        var output = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",output);
        var response = uploads.uploadImage(new MockMultipartFile("file","photo.fake","text/plain",output.toByteArray()),"activite");
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        String key = response.getBody().get("storageKey");
        images.validate(key); assertThat(images.url(key)).isEqualTo(response.getBody().get("url"));
        assertThat(Files.exists(folder.resolve(key))).isTrue();
        assertThat(images.url(null)).isNull();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("other@example.test","unused",List.of(new SimpleGrantedAuthority("ROLE_REFERENT"))));
        assertThatThrownBy(() -> images.validate(key)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void rejectsFakeContentOversizeAndArbitraryKeys() {
        assertThat(uploads.uploadImage(new MockMultipartFile("file","photo.png","image/png","not an image".getBytes()),"activite").getStatusCode().value()).isEqualTo(400);
        assertThat(uploads.uploadImage(new MockMultipartFile("file","photo.png","image/png",new byte[5*1024*1024+1]),"activite").getStatusCode().value()).isEqualTo(400);
        for(String key:List.of("../secret","https://example.test/image.png","activites/missing.png"))
            assertThatThrownBy(() -> images.validate(key)).isInstanceOf(IllegalArgumentException.class);
    }
}
