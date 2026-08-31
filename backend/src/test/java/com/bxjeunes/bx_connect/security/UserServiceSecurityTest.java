package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.ChangePasswordRequest;
import com.bxjeunes.bx_connect.dto.UserProfileRequest;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceSecurityTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, passwordEncoder);
    }

    @Test
    @DisplayName("SUPER_ADMIN est refuse sur les operations generales de profil avant lecture ou ecriture metier")
    void super_admin_est_refuse_sur_operations_generales_profil() {
        User superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setEmail("root@test.be");
        superAdmin.setRole(Role.SUPER_ADMIN);
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));

        assertDenied(() -> userService.getMonProfil(superAdmin.getEmail()));
        assertDenied(() -> userService.modifierMonProfil(superAdmin.getEmail(), new UserProfileRequest()));
        assertDenied(() -> userService.demanderSuppression(superAdmin.getEmail()));

        verify(userRepository, times(3)).findByEmail(superAdmin.getEmail());
        verifyNoMoreInteractions(userRepository);
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    @DisplayName("SUPER_ADMIN change son propre mot de passe avec verification et invalidation des JWT")
    void super_admin_change_son_propre_mot_de_passe() {
        User superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setEmail("root@test.be");
        superAdmin.setRole(Role.SUPER_ADMIN);
        superAdmin.setMotDePasse("hash-actuel");
        superAdmin.setCredentialsVersion(4);
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));
        when(passwordEncoder.matches("AncienSecret123!", "hash-actuel")).thenReturn(true);
        when(passwordEncoder.encode("NouveauSecret123!")).thenReturn("nouveau-hash");

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setAncienMotDePasse("AncienSecret123!");
        request.setNouveauMotDePasse("NouveauSecret123!");

        userService.changerMotDePasse(superAdmin.getEmail(), request);

        assertThat(superAdmin.getMotDePasse()).isEqualTo("nouveau-hash");
        assertThat(superAdmin.getCredentialsVersion()).isEqualTo(5);
        verify(userRepository).findByEmail("root@test.be");
        verify(passwordEncoder).matches("AncienSecret123!", "hash-actuel");
        verify(passwordEncoder).encode("NouveauSecret123!");
        verify(userRepository).save(superAdmin);
        verifyNoMoreInteractions(userRepository, passwordEncoder);
    }

    private void assertDenied(Runnable operation) {
        assertThatThrownBy(operation::run)
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("SUPER_ADMIN");
    }
}
