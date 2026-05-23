package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.GroupeRequest;
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
