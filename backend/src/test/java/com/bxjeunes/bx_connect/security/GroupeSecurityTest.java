package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.GroupeRequest;
import com.bxjeunes.bx_connect.dto.admin.AdminGroupeRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.GroupeService;
import com.bxjeunes.bx_connect.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Tests de securite sur les autorisations des groupes.
 * Coherent avec GroupeService qui utilise :
 *   modifierGroupe(Long id, GroupeRequest request, String emailUser)
 *   accepterAdhesion(Long membreGroupeId, String emailReferent)
 *   refuserAdhesion(Long membreGroupeId, String emailReferent)
 */
@ExtendWith(MockitoExtension.class)
class GroupeSecurityTest {

    @Mock private GroupeRepository groupeRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private GroupeService groupeService;

    private User referent1;
    private User referent2;
    private Groupe groupeDeReferent1;

    @BeforeEach
    void setUp() {
        referent1 = new User();
        referent1.setId(1L);
        referent1.setEmail("referent1@test.be");
        referent1.setRole(Role.REFERENT);
        referent1.setPrenom("Ref");
        referent1.setNom("Un");

        referent2 = new User();
        referent2.setId(2L);
        referent2.setEmail("referent2@test.be");
        referent2.setRole(Role.REFERENT);
        referent2.setPrenom("Ref");
        referent2.setNom("Deux");

        groupeDeReferent1 = new Groupe();
        groupeDeReferent1.setId(10L);
        groupeDeReferent1.setNom("Groupe Numerique");
        groupeDeReferent1.setReferent(referent1);
        groupeDeReferent1.setStatut(StatutGroupe.VALIDE);
    }

    @Test
    @DisplayName("Un referent ne peut pas modifier le groupe d'un autre referent")
    void referent_ne_peut_pas_modifier_groupe_dautrui() {
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeDeReferent1));
        when(userRepository.findByEmail("referent2@test.be")).thenReturn(Optional.of(referent2));

        GroupeRequest request = new GroupeRequest();
        request.setNom("Groupe Pirate");

        assertThatThrownBy(() ->
            groupeService.modifierGroupe(10L, request, "referent2@test.be")
        ).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Un referent ne peut pas lister les membres d'un groupe d'un autre referent")
    void referent_ne_peut_pas_lister_membres_groupe_dautrui() {
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeDeReferent1));
        when(userRepository.findByEmail("referent2@test.be")).thenReturn(Optional.of(referent2));

        assertThatThrownBy(() ->
            groupeService.getMembresReferent(10L, "referent2@test.be")
        ).isInstanceOf(AccessDeniedException.class)
         .hasMessageContaining("referent de ce groupe");
    }

    @Test
    @DisplayName("Un referent peut lister les membres de son propre groupe")
    void referent_peut_lister_membres_son_groupe() {
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeDeReferent1));
        when(userRepository.findByEmail("referent1@test.be")).thenReturn(Optional.of(referent1));
        when(membreGroupeRepository.findByGroupeId(10L)).thenReturn(java.util.List.of());

        groupeService.getMembresReferent(10L, "referent1@test.be");
    }

    @Test
    @DisplayName("Un referent peut modifier son propre groupe")
    void referent_peut_modifier_son_propre_groupe() {
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeDeReferent1));
        when(userRepository.findByEmail("referent1@test.be")).thenReturn(Optional.of(referent1));
        when(groupeRepository.save(groupeDeReferent1)).thenReturn(groupeDeReferent1);

        GroupeRequest request = new GroupeRequest();
        request.setNom("Groupe Numerique V2");

        // Ne doit pas lever d'exception
        groupeService.modifierGroupe(10L, request, "referent1@test.be");
    }

    @Test
    @DisplayName("ADMIN peut creer un groupe assigne a un REFERENT")
    void admin_peut_creer_groupe_assigne_referent() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(referent1));
        when(groupeRepository.save(org.mockito.ArgumentMatchers.any(Groupe.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        AdminGroupeRequest request = new AdminGroupeRequest();
        request.setNom("Groupe Creatif");
        request.setReferentId(1L);

        groupeService.creerGroupeParAdmin(request);

        org.mockito.Mockito.verify(groupeRepository).save(
                org.mockito.ArgumentMatchers.argThat(groupe ->
                        groupe.getReferent().getId().equals(1L)
                                && groupe.getStatut() == StatutGroupe.VALIDE
                                && groupe.isActif())
        );
    }

    @Test
    @DisplayName("ADMIN ne peut pas assigner un groupe a un utilisateur non REFERENT")
    void admin_ne_peut_pas_assigner_groupe_non_referent() {
        User membre = new User();
        membre.setId(3L);
        membre.setEmail("membre@test.be");
        membre.setRole(Role.MEMBRE);
        membre.setActif(true);

        when(userRepository.findById(3L)).thenReturn(Optional.of(membre));

        AdminGroupeRequest request = new AdminGroupeRequest();
        request.setNom("Groupe Solidaire");
        request.setReferentId(3L);

        assertThatThrownBy(() -> groupeService.creerGroupeParAdmin(request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("REFERENT");
    }

    @Test
    @DisplayName("ADMIN peut reassigner un groupe a un autre REFERENT")
    void admin_peut_reassigner_groupe_autre_referent() {
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeDeReferent1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(referent2));
        when(groupeRepository.save(groupeDeReferent1)).thenReturn(groupeDeReferent1);

        groupeService.assignerReferent(10L, 2L);

        org.assertj.core.api.Assertions.assertThat(groupeDeReferent1.getReferent()).isEqualTo(referent2);
    }

    @Test
    @DisplayName("Un referent ne peut pas accepter une adhesion dans le groupe d'un autre referent")
    void referent_ne_peut_pas_accepter_adhesion_dautrui() {
        User membre = new User();
        membre.setId(99L);
        membre.setPrenom("Jean");
        membre.setNom("Dupont");
        membre.setEmail("jean@test.be");

        MembreGroupe mg = new MembreGroupe();
        mg.setId(100L);
        mg.setGroupe(groupeDeReferent1);
        mg.setUser(membre);
        mg.setStatut(StatutMembre.EN_ATTENTE);

        when(membreGroupeRepository.findById(100L)).thenReturn(Optional.of(mg));
        when(userRepository.findByEmail("referent2@test.be")).thenReturn(Optional.of(referent2));

        assertThatThrownBy(() ->
            groupeService.accepterAdhesion(100L, "referent2@test.be")
        ).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Modifier un groupe inexistant doit lever une RuntimeException")
    void modifier_groupe_inexistant_leve_exception() {
        when(groupeRepository.findById(999L)).thenReturn(Optional.empty());

        GroupeRequest request = new GroupeRequest();
        request.setNom("Test");

        assertThatThrownBy(() ->
            groupeService.modifierGroupe(999L, request, "referent1@test.be")
        ).isInstanceOf(RuntimeException.class)
         .hasMessageContaining("introuvable");
    }
}
