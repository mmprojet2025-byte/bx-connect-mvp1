package com.bxjeunes.bx_connect.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProfilePhotoUrlValidatorTest {

    private final ProfilePhotoUrlValidator validator =
            new ProfilePhotoUrlValidator("https://api.example.org/uploads");

    @Test
    void accepteUnePhotoIssueDuRepertoireAutorise() {
        assertThat(validator.validateAndNormalize(
                "https://api.example.org/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.webp"))
                .isEqualTo("https://api.example.org/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.webp");
    }

    @Test
    void accepteUnePhotoAbsentePourLesAnciensProfils() {
        assertThat(validator.validateAndNormalize(null)).isNull();
        assertThat(validator.validateAndNormalize("  ")).isNull();
    }

    @Test
    void refuseLesValeursDangereusesOuNonAutorisees() {
        for (String value : new String[] {
                "file:///tmp/photo.jpg",
                "javascript:alert(1)",
                "data:image/png;base64,AAAA",
                "https://evil.example/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.jpg",
                "https://api.example.org/uploads/projets/123e4567-e89b-12d3-a456-426614174000.jpg",
                "https://api.example.org/uploads/avatars/../projets/123e4567-e89b-12d3-a456-426614174000.jpg",
                "https://api.example.org/uploads/avatars/%2e%2e/projets/photo.jpg",
                "https://api.example.org/uploads/avatars/photo.jpg",
                "https://api.example.org/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.jpg?token=secret"
        }) {
            assertThatThrownBy(() -> validator.validateAndNormalize(value))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("service d'upload autorisé");
        }
    }
}
