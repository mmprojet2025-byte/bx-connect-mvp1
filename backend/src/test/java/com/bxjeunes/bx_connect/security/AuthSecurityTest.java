package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.RegisterRequest;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Tests de securite sur l'inscription.
 * Verifie que le role est toujours force a MEMBRE cote serveur.
 */
@ExtendWith(MockitoExtension.class)
class AuthSecurityTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private com.bxjeunes.bx_connect.config.JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private void mockSuccessfulRegistration() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$12$hashed");
        when(jwtService.generateToken(any(User.class))).thenReturn("fake.jwt.token");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("L'inscription publique cree toujours un compte MEMBRE")
    void inscription_publique_cree_toujours_un_membre() {
        mockSuccessfulRegistration();

        var response = authService.register(buildRequest("lucas@test.be"));
        assertThat(response.getRole()).isEqualTo(Role.MEMBRE);
    }

    @Test
    @DisplayName("Le role sauvegarde est toujours MEMBRE")
    void role_sauvegarde_est_toujours_membre() {
        mockSuccessfulRegistration();

        authService.register(buildRequest("nouveau@test.be"));
        org.mockito.Mockito.verify(userRepository).save(
            org.mockito.ArgumentMatchers.argThat(user -> user.getRole() == Role.MEMBRE)
        );
    }

    @Test
    @DisplayName("Aucun role ADMIN ne peut etre cree via l'inscription publique")
    void inscription_ne_cree_jamais_admin() {
        mockSuccessfulRegistration();

        var response = authService.register(buildRequest("test@test.be"));
        assertThat(response.getRole()).isNotEqualTo(Role.ADMIN);
        assertThat(response.getRole()).isNotEqualTo(Role.SUPER_ADMIN);
        assertThat(response.getRole()).isNotEqualTo(Role.REFERENT);
        assertThat(response.getRole()).isNotEqualTo(Role.PARTENAIRE);
    }

    @Test
    @DisplayName("L'inscription avec un email existant leve une exception")
    void inscription_email_existant_leve_exception() {
        when(userRepository.existsByEmail("existant@test.be")).thenReturn(true);
        assertThatThrownBy(() -> authService.register(buildRequest("existant@test.be")))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("existe");
    }

    @Test
    @DisplayName("RegisterRequest ne doit pas avoir de champ role")
    void register_request_na_pas_de_champ_role() {
        try {
            RegisterRequest.class.getDeclaredField("role");
            throw new AssertionError(
                "SECURITE : Le champ role ne doit pas exister dans RegisterRequest.");
        } catch (NoSuchFieldException e) {
            // Correct : le champ role n'existe pas
        }
    }

    private RegisterRequest buildRequest(String email) {
        RegisterRequest req = new RegisterRequest();
        req.setPrenom("Test");
        req.setNom("User");
        req.setEmail(email);
        req.setMotDePasse("Password123!");
        return req;
    }
}
