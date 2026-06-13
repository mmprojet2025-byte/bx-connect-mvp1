package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.PrestationBenevole;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.PrestationBenevoleRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.NotificationService;
import com.bxjeunes.bx_connect.service.PrestationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrestationSecurityTest {

    @Mock private PrestationBenevoleRepository prestationRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks private PrestationService prestationService;

    private User admin;
    private User referentA;
    private User referentB;
    private Groupe groupeA;
    private PrestationBenevole prestationA;

    @BeforeEach
    void setUp() {
        admin = user(1L, "admin@test.be", Role.ADMIN);
        referentA = user(2L, "referent-a@test.be", Role.REFERENT);
        referentB = user(3L, "referent-b@test.be", Role.REFERENT);

        groupeA = new Groupe();
        groupeA.setId(10L);
        groupeA.setNom("Groupe A");
        groupeA.setReferent(referentA);

        prestationA = new PrestationBenevole();
        prestationA.setId(20L);
        prestationA.setGroupe(groupeA);
    }

    @Test
    @DisplayName("Un referent ne consulte pas les prestations d'un autre groupe")
    void referent_ne_consulte_pas_prestations_autre_groupe() {
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeA));

        assertThatThrownBy(() -> prestationService.prestationsGroupe(10L, referentB.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        verify(prestationRepository, never()).findByGroupeId(10L);
    }

    @Test
    @DisplayName("Un referent consulte les prestations de son groupe")
    void referent_consulte_prestations_propre_groupe() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeA));
        when(prestationRepository.findByGroupeId(10L)).thenReturn(List.of(prestationA));

        assertThat(prestationService.prestationsGroupe(10L, referentA.getEmail())).hasSize(1);
    }

    @Test
    @DisplayName("Un referent ne valide pas une prestation d'un autre groupe")
    void referent_ne_valide_pas_prestation_autre_groupe() {
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(prestationRepository.findById(20L)).thenReturn(Optional.of(prestationA));

        assertThatThrownBy(() ->
                prestationService.validerPrestation(20L, "Tentative", referentB.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        verify(prestationRepository, never()).save(any(PrestationBenevole.class));
    }

    @Test
    @DisplayName("Un referent ne refuse pas une prestation d'un autre groupe")
    void referent_ne_refuse_pas_prestation_autre_groupe() {
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(prestationRepository.findById(20L)).thenReturn(Optional.of(prestationA));

        assertThatThrownBy(() ->
                prestationService.refuserPrestation(20L, "Tentative", referentB.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        verify(prestationRepository, never()).save(any(PrestationBenevole.class));
    }

    @Test
    @DisplayName("ADMIN conserve l'acces aux prestations de tous les groupes")
    void admin_conserve_acces_tous_groupes() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeA));
        when(prestationRepository.findByGroupeId(10L)).thenReturn(List.of());

        prestationService.prestationsGroupe(10L, admin.getEmail());

        verify(prestationRepository).findByGroupeId(10L);
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setRole(role);
        return user;
    }
}
