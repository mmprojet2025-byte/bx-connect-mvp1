package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.AuthResponse;
import com.bxjeunes.bx_connect.dto.UserProfileResponse;
import com.bxjeunes.bx_connect.dto.UserResponse;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.entity.Role;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;

class BirthDatePrivacyTest {

    @Test
    @DisplayName("La date de naissance n'est exposee par aucun DTO utilisateur existant")
    void date_naissance_absente_des_dto_utilisateur() {
        assertNoBirthDate(AuthResponse.class);
        assertNoBirthDate(UserResponse.class);
        assertNoBirthDate(UserProfileResponse.class);
    }

    @Test
    @DisplayName("Une entite utilisateur serialisee accidentellement masque la date de naissance")
    void date_naissance_masquee_sur_entite() throws Exception {
        User user = new User();
        user.setDateNaissance(java.time.LocalDate.of(1990, 1, 2));
        user.setRole(Role.MEMBRE);

        String json = JsonMapper.builder().findAndAddModules().build().writeValueAsString(user);

        assertThat(json).doesNotContain("dateNaissance", "1990-01-02");
    }

    @Test
    @DisplayName("Un ancien compte sans date reste convertible vers son profil prive")
    void ancien_compte_sans_date_reste_compatible() {
        User user = new User();
        user.setDateNaissance(null);

        UserProfileResponse response = UserProfileResponse.fromEntity(user);

        assertThat(response).isNotNull();
    }

    private void assertNoBirthDate(Class<?> dtoClass) {
        assertThatThrownBy(() -> dtoClass.getDeclaredField("dateNaissance"))
                .isInstanceOf(NoSuchFieldException.class);
    }
}
