package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.controller.AdminController;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AdminReferentService;
import com.bxjeunes.bx_connect.service.GroupeService;
import com.bxjeunes.bx_connect.service.PrestationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminControllerSecurityTest {

    @Mock private UserRepository userRepository;
    @Mock private ActiviteRepository activiteRepository;
    @Mock private InscriptionRepository inscriptionRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private GroupeService groupeService;
    @Mock private AdminReferentService adminReferentService;
    @Mock private PrestationService prestationService;

    private AdminController adminController;

    @BeforeEach
    void setUp() {
        adminController = new AdminController(
                userRepository,
                activiteRepository,
                inscriptionRepository,
                groupeRepository,
                groupeService,
                adminReferentService,
                prestationService);
    }

    @Test
    @DisplayName("/api/admin/utilisateurs ne retourne jamais ADMIN ni SUPER_ADMIN")
    void liste_utilisateurs_exclut_admins_et_super_admins() {
        when(userRepository.findAll()).thenReturn(List.of(
                user(1L, Role.SUPER_ADMIN),
                user(2L, Role.ADMIN),
                user(3L, Role.MEMBRE),
                user(4L, Role.REFERENT),
                user(5L, Role.PARTENAIRE)
        ));

        var response = adminController.getAllUtilisateurs();

        assertThat(response.getBody())
                .extracting("role")
                .containsExactlyInAnyOrder(Role.MEMBRE, Role.REFERENT, Role.PARTENAIRE)
                .doesNotContain(Role.ADMIN, Role.SUPER_ADMIN);
    }

    @Test
    @DisplayName("Le KPI utilisateurs ADMIN compte uniquement les comptes metier")
    void statistiques_utilisateurs_excluent_comptes_plateforme() {
        when(userRepository.countByRoleIn(List.of(Role.MEMBRE, Role.REFERENT, Role.PARTENAIRE)))
                .thenReturn(12L);
        when(prestationService.statistiques()).thenReturn(Map.of(
                "enAttente", 0L,
                "validees", 0L));
        when(groupeRepository.findByStatut(any())).thenReturn(List.of());

        var response = adminController.getStats();

        assertThat(response.getBody()).containsEntry("totalUtilisateurs", 12L);
        verify(userRepository, never()).count();
    }

    @Test
    @DisplayName("ADMIN ne peut pas modifier le role d'un ADMIN")
    void admin_ne_modifie_pas_role_admin() {
        User admin = user(2L, Role.ADMIN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> adminController.changerRole(2L, "MEMBRE"))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("ADMIN ne peut pas modifier le role d'un SUPER_ADMIN")
    void admin_ne_modifie_pas_role_super_admin() {
        User superAdmin = user(1L, Role.SUPER_ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));

        assertThatThrownBy(() -> adminController.changerRole(1L, "MEMBRE"))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("ADMIN ne peut pas desactiver un ADMIN")
    void admin_ne_desactive_pas_admin() {
        User admin = user(2L, Role.ADMIN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> adminController.toggleActif(2L))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("ADMIN ne peut pas desactiver un SUPER_ADMIN")
    void admin_ne_desactive_pas_super_admin() {
        User superAdmin = user(1L, Role.SUPER_ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));

        assertThatThrownBy(() -> adminController.toggleActif(1L))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("ADMIN ne peut pas supprimer un ADMIN")
    void admin_ne_supprime_pas_admin() {
        User admin = user(2L, Role.ADMIN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> adminController.supprimerUtilisateur(2L))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    @DisplayName("ADMIN ne peut pas supprimer un SUPER_ADMIN")
    void admin_ne_supprime_pas_super_admin() {
        User superAdmin = user(1L, Role.SUPER_ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));

        assertThatThrownBy(() -> adminController.supprimerUtilisateur(1L))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).delete(any(User.class));
    }

    private User user(Long id, Role role) {
        User user = new User();
        user.setId(id);
        user.setPrenom("Test");
        user.setNom("User");
        user.setEmail("user" + id + "@test.be");
        user.setRole(role);
        user.setActif(true);
        user.setMotDePasse("secret");
        return user;
    }
}
