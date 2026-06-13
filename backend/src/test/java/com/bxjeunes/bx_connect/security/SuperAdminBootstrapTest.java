package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.config.SuperAdminBootstrap;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SuperAdminBootstrapTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditLogService auditLogService;

    private SuperAdminBootstrap bootstrap;

    @BeforeEach
    void setUp() {
        bootstrap = new SuperAdminBootstrap(userRepository, passwordEncoder, auditLogService);
        ReflectionTestUtils.setField(bootstrap, "email", "super@bx.test");
        ReflectionTestUtils.setField(bootstrap, "password", "Temp12345!");
        ReflectionTestUtils.setField(bootstrap, "prenom", "System");
        ReflectionTestUtils.setField(bootstrap, "nom", "Root");
    }

    @Test
    @DisplayName("Le bootstrap cree le premier SUPER_ADMIN si aucun n'existe")
    void bootstrap_cree_premier_super_admin() {
        when(userRepository.existsByRole(Role.SUPER_ADMIN)).thenReturn(false);
        when(userRepository.existsByEmail("super@bx.test")).thenReturn(false);
        when(passwordEncoder.encode("Temp12345!")).thenReturn("$2a$hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        bootstrap.run(null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("super@bx.test");
        assertThat(saved.getRole()).isEqualTo(Role.SUPER_ADMIN);
        assertThat(saved.isActif()).isTrue();
        assertThat(saved.getMotDePasse()).isEqualTo("$2a$hashed");
        verify(auditLogService).logSystem(
                org.mockito.ArgumentMatchers.eq("BOOTSTRAP_SUPER_ADMIN_CREATED"),
                org.mockito.ArgumentMatchers.same(saved),
                org.mockito.ArgumentMatchers.contains("Creation automatique"));
    }

    @Test
    @DisplayName("Le bootstrap ne modifie rien si un SUPER_ADMIN existe deja")
    void bootstrap_ne_fait_rien_si_super_admin_existe() {
        when(userRepository.existsByRole(Role.SUPER_ADMIN)).thenReturn(true);

        bootstrap.run(null);

        verify(userRepository, never()).save(any(User.class));
        verify(auditLogService, never()).logSystem(any(), any(), any());
    }

    @Test
    @DisplayName("Le bootstrap ne cree rien sans BX_SUPER_ADMIN_PASSWORD")
    void bootstrap_ne_cree_rien_sans_mot_de_passe() {
        ReflectionTestUtils.setField(bootstrap, "password", "");
        when(userRepository.existsByRole(Role.SUPER_ADMIN)).thenReturn(false);

        bootstrap.run(null);

        verify(userRepository, never()).existsByEmail(any());
        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any(User.class));
        verify(auditLogService, never()).logSystem(any(), any(), any());
    }

    @Test
    @DisplayName("Le bootstrap refuse de promouvoir un email deja utilise")
    void bootstrap_refuse_email_deja_utilise() {
        when(userRepository.existsByRole(Role.SUPER_ADMIN)).thenReturn(false);
        when(userRepository.existsByEmail("super@bx.test")).thenReturn(true);

        assertThatThrownBy(() -> bootstrap.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("email deja utilise");

        verify(userRepository, never()).save(any(User.class));
    }
}
