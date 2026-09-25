package com.bxjeunes.bx_connect.integration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class ProfilePhotoMigrationTest {

    @Test
    void migrationAjouteUneColonneNullableSansModifierLaBaseline() throws IOException {
        try (var stream = getClass().getResourceAsStream(
                "/db/migration/V6__add_user_profile_photo.sql")) {
            assertThat(stream).isNotNull();
            String sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(sql).contains("ALTER TABLE utilisateurs")
                    .contains("photo_profil_url VARCHAR(500) NULL");
        }
    }
}
