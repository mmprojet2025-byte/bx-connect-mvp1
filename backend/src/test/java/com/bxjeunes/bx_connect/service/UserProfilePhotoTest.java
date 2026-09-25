package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.UserProfileRequest;
import com.bxjeunes.bx_connect.dto.UserProfileResponse;
import com.bxjeunes.bx_connect.entity.Langue;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfilePhotoTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    private UserService userService;
    private User user;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder,
                new ProfilePhotoUrlValidator("https://api.example.org/uploads"));
        user = User.builder()
                .id(1L)
                .prenom("Amina")
                .nom("Test")
                .email("amina@example.org")
                .role(Role.MEMBRE)
                .languePreference(Langue.FR)
                .build();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    @Test
    void retourneUnAncienProfilSansPhoto() {
        UserProfileResponse response = userService.getMonProfil(user.getEmail());

        assertThat(response.getPhotoProfilUrl()).isNull();
    }

    @Test
    void enregistrePuisRetourneLaPhotoDuProfil() {
        UserProfileRequest request = new UserProfileRequest();
        request.setPrenom("Amina");
        request.setNom("Test");
        request.setLanguePreference(Langue.NL);
        request.setPhotoProfilUrl("https://api.example.org/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.webp");

        UserProfileResponse saved = userService.modifierMonProfil(user.getEmail(), request);
        UserProfileResponse reloaded = userService.getMonProfil(user.getEmail());

        assertThat(saved.getPhotoProfilUrl()).isEqualTo(request.getPhotoProfilUrl());
        assertThat(reloaded.getPhotoProfilUrl()).isEqualTo(request.getPhotoProfilUrl());
        verify(userRepository).save(user);
    }

    @Test
    void conserveLaPhotoQuandUnAncienClientOmetLeChamp() {
        user.setPhotoProfilUrl("https://api.example.org/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.webp");
        UserProfileRequest request = new UserProfileRequest();
        request.setPrenom("Amina");
        request.setNom("Test");

        UserProfileResponse response = userService.modifierMonProfil(user.getEmail(), request);

        assertThat(response.getPhotoProfilUrl())
                .isEqualTo("https://api.example.org/uploads/avatars/123e4567-e89b-12d3-a456-426614174000.webp");
    }
}
