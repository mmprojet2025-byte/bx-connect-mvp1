package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.superadmin.CreateAdminRequest;
import com.bxjeunes.bx_connect.dto.superadmin.ResetAdminPasswordRequest;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.AuditLogRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.SuperAdminService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SuperAdminServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditLogService auditLogService;
    @Mock private AuditLogRepository auditLogRepository;

    @InjectMocks
    private SuperAdminService superAdminService;

    @Test
    @DisplayName("SUPER_ADMIN cree uniquement un compte ADMIN")
    void super_admin_cree_uniquement_admin() {
        User superAdmin = user(1L, "root@test.be", Role.SUPER_ADMIN, true);
        when(userRepository.findByEmail("root@test.be")).thenReturn(Optional.of(superAdmin));
        when(userRepository.existsByEmail("admin@test.be")).thenReturn(false);
        when(passwordEncoder.encode("Temp12345!")).thenReturn("$2a$hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateAdminRequest request = new CreateAdminRequest();
        request.setPrenom("Ada");
        request.setNom("Admin");
        request.setEmail("admin@test.be");
        request.setMotDePasseTemporaire("Temp12345!");

        var response = superAdminService.creerAdmin(request, "root@test.be");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        assertThat(response.getEmail()).isEqualTo("admin@test.be");
        assertThat(captor.getValue().getRole()).isEqualTo(Role.ADMIN);
        assertThat(captor.getValue().isActif()).isTrue();
        verify(auditLogService).log(superAdmin, "CREATE_ADMIN", "USER", captor.getValue(),
                "Creation d'un compte ADMIN.");
    }

    @Test
    @DisplayName("Un ADMIN ne peut pas utiliser le service SUPER_ADMIN")
    void admin_ne_peut_pas_utiliser_service_super_admin() {
        User admin = user(2L, "admin@test.be", Role.ADMIN, true);
        when(userRepository.findByEmail("admin@test.be")).thenReturn(Optional.of(admin));

        CreateAdminRequest request = new CreateAdminRequest();
        request.setEmail("new-admin@test.be");

        assertThatThrownBy(() -> superAdminService.creerAdmin(request, "admin@test.be"))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Impossible de desactiver le dernier ADMIN actif")
    void impossible_de_desactiver_dernier_admin_actif() {
        User superAdmin = user(1L, "root@test.be", Role.SUPER_ADMIN, true);
        User admin = user(2L, "admin@test.be", Role.ADMIN, true);

        when(userRepository.findByEmail("root@test.be")).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));
        when(userRepository.countByRoleAndActifTrue(Role.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> superAdminService.desactiverAdmin(2L, "root@test.be"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("dernier ADMIN actif");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Impossible de modifier un SUPER_ADMIN via les actions ADMIN")
    void impossible_de_modifier_super_admin() {
        User superAdmin = user(1L, "root@test.be", Role.SUPER_ADMIN, true);
        when(userRepository.findByEmail("root@test.be")).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));

        assertThatThrownBy(() -> superAdminService.desactiverAdmin(1L, "root@test.be"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("SUPER_ADMIN");
    }

    @Test
    @DisplayName("SUPER_ADMIN peut reinitialiser le mot de passe d'un ADMIN")
    void super_admin_reset_mot_de_passe_admin() {
        User superAdmin = user(1L, "root@test.be", Role.SUPER_ADMIN, true);
        User admin = user(2L, "admin@test.be", Role.ADMIN, true);
        when(userRepository.findByEmail("root@test.be")).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));
        when(passwordEncoder.encode("NewTemp123!")).thenReturn("$2a$newhash");
        when(userRepository.save(admin)).thenReturn(admin);

        ResetAdminPasswordRequest request = new ResetAdminPasswordRequest();
        request.setNouveauMotDePasseTemporaire("NewTemp123!");

        superAdminService.resetPasswordAdmin(2L, request, "root@test.be");

        assertThat(admin.getMotDePasse()).isEqualTo("$2a$newhash");
        verify(auditLogService).log(superAdmin, "RESET_ADMIN_PASSWORD", "USER", admin,
                "Reinitialisation du mot de passe d'un compte ADMIN.");
    }

    private User user(Long id, String email, Role role, boolean actif) {
        User user = new User();
        user.setId(id);
        user.setPrenom("Test");
        user.setNom("User");
        user.setEmail(email);
        user.setRole(role);
        user.setActif(actif);
        user.setMotDePasse("secret");
        return user;
    }
}
