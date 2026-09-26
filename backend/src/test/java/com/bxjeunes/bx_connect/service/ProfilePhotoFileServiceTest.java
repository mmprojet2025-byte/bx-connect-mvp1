package com.bxjeunes.bx_connect.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ProfilePhotoFileServiceTest {

    @TempDir Path uploadDirectory;

    @Test
    void deletes_only_a_generated_avatar_from_the_configured_upload_service() throws Exception {
        Path avatars = Files.createDirectories(uploadDirectory.resolve("avatars"));
        String filename = "123e4567-e89b-12d3-a456-426614174000.webp";
        Path photo = Files.writeString(avatars.resolve(filename), "image");
        ProfilePhotoFileService service = new ProfilePhotoFileService(uploadDirectory.toString(), "https://api.example.org/uploads");

        assertThat(service.deleteOwnedProfilePhoto("https://api.example.org/uploads/avatars/" + filename)).isTrue();
        assertThat(photo).doesNotExist();
    }

    @Test
    void never_deletes_an_untrusted_or_non_avatar_path() throws Exception {
        Path sentinel = Files.writeString(uploadDirectory.resolve("keep.txt"), "keep");
        ProfilePhotoFileService service = new ProfilePhotoFileService(uploadDirectory.toString(), "https://api.example.org/uploads");

        assertThat(service.deleteOwnedProfilePhoto("https://evil.example/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.webp")).isFalse();
        assertThat(service.deleteOwnedProfilePhoto("https://api.example.org/uploads/avatars/../keep.txt")).isFalse();
        assertThat(sentinel).exists();
    }
}
