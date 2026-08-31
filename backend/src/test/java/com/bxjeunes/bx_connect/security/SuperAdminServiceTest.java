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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
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
    @DisplayName("Le tableau de bord conserve les compteurs ADMIN et utilise uniquement l'audit technique")
    void dashboardUtiliseUniquementAuditTechnique() {
        when(userRepository.countByRoleAndActifTrue(Role.ADMIN)).thenReturn(2L);
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(3L);
        when(auditLogService.compterActionsTechniques()).thenReturn(4L);
        when(auditLogService.derniersLogs()).thenReturn(List.of());

        var response = superAdminService.dashboard();

        assertThat(response.getAdminsActifs()).isEqualTo(2L);
        assertThat(response.getAdminsInactifs()).isEqualTo(1L);
        assertThat(response.getTotalActionsCritiques()).isEqualTo(4L);
        assertThat(response.getDerniersLogs()).isEmpty();
        verify(auditLogService).compterActionsTechniques();
        verify(auditLogService).derniersLogs();
    }

    @Test
    @DisplayName("L'annuaire technique demande exclusivement les comptes ADMIN")
    void annuaire_technique_demande_exclusivement_admin() {
        User admin = user(2L, "admin@test.be", Role.ADMIN, true);
        when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(admin));

        var response = superAdminService.listerAdmins();

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getEmail()).isEqualTo("admin@test.be");
        verify(userRepository).findByRole(Role.ADMIN);
    }

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

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"MEMBRE", "REFERENT", "PARTENAIRE"})
    @DisplayName("Une cible non ADMIN est refusee par identifiant direct")
    void cible_non_admin_refusee_par_identifiant_direct(Role role) {
        User superAdmin = user(1L, "root@test.be", Role.SUPER_ADMIN, true);
        User cible = user(9L, "cible@test.be", role, true);
        when(userRepository.findByEmail("root@test.be")).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(9L)).thenReturn(Optional.of(cible));

        assertThatThrownBy(() -> superAdminService.desactiverAdmin(9L, "root@test.be"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("uniquement les ADMIN");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("SUPER_ADMIN conserve activation et desactivation d'un ADMIN")
    void super_admin_conserve_activation_et_desactivation_admin() {
        User superAdmin = user(1L, "root@test.be", Role.SUPER_ADMIN, true);
        User admin = user(2L, "admin@test.be", Role.ADMIN, true);
        when(userRepository.findByEmail("root@test.be")).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));
        when(userRepository.countByRoleAndActifTrue(Role.ADMIN)).thenReturn(2L);
        when(userRepository.save(admin)).thenReturn(admin);

        superAdminService.desactiverAdmin(2L, "root@test.be");
        superAdminService.reactiverAdmin(2L, "root@test.be");

        assertThat(admin.isActif()).isTrue();
        verify(userRepository, times(2)).save(admin);
        verify(auditLogService).log(superAdmin, "DISABLE_ADMIN", "USER", admin,
                "Desactivation d'un compte ADMIN.");
        verify(auditLogService).log(superAdmin, "ENABLE_ADMIN", "USER", admin,
                "Reactivation d'un compte ADMIN.");
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

    @Test
    @DisplayName("Echec AuditLog ne bloque pas la creation d'un ADMIN")
    void echec_audit_log_ne_bloque_pas_creation_admin() {
        User superAdmin = user(1L, "root@test.be", Role.SUPER_ADMIN, true);
        when(userRepository.findByEmail("root@test.be")).thenReturn(Optional.of(superAdmin));
        when(userRepository.existsByEmail("admin@test.be")).thenReturn(false);
        when(passwordEncoder.encode("Temp12345!")).thenReturn("$2a$hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        doThrow(new RuntimeException("audit indisponible"))
                .when(auditLogService)
                .log(any(User.class), any(String.class), any(String.class), any(User.class), any(String.class));

        CreateAdminRequest request = new CreateAdminRequest();
        request.setPrenom("Ada");
        request.setNom("Admin");
        request.setEmail("admin@test.be");
        request.setMotDePasseTemporaire("Temp12345!");

        var response = superAdminService.creerAdmin(request, "root@test.be");

        assertThat(response.getEmail()).isEqualTo("admin@test.be");
        verify(userRepository).save(any(User.class));
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
