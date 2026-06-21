package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.GroupeRequest;
import com.bxjeunes.bx_connect.dto.admin.AdminGroupeRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AuditLogService;
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

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;
import static org.mockito.ArgumentMatchers.any;

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
    @Mock private AuditLogService auditLogService;

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
    @DisplayName("Un referent ne peut pas lister les demandes d'un groupe d'un autre referent")
    void referent_ne_peut_pas_lister_demandes_groupe_dautrui() {
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeDeReferent1));
        when(userRepository.findByEmail("referent2@test.be")).thenReturn(Optional.of(referent2));

        assertThatThrownBy(() ->
            groupeService.demandesEnAttenteAdminOuReferent(10L, "referent2@test.be")
        ).isInstanceOf(AccessDeniedException.class)
         .hasMessageContaining("referent de ce groupe");
    }

    @Test
    @DisplayName("Un groupe non valide est invisible via le detail public")
    void groupe_non_valide_invisible_publiquement() {
        Groupe groupeEnAttente = new Groupe();
        groupeEnAttente.setId(20L);
        groupeEnAttente.setNom("Groupe en attente");
        groupeEnAttente.setReferent(referent1);
        groupeEnAttente.setStatut(StatutGroupe.EN_ATTENTE);
        when(groupeRepository.findById(20L)).thenReturn(Optional.of(groupeEnAttente));

        assertThatThrownBy(() -> groupeService.getGroupe(20L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Groupe introuvable");
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
        request.setAdresseReunion("Rue du Groupe 12");
        request.setCommune("Bruxelles");
        request.setLatitude(new BigDecimal("50.8503000"));
        request.setLongitude(new BigDecimal("4.3517000"));

        var response = groupeService.modifierGroupe(10L, request, "referent1@test.be");

        assertThat(response.getAdresseReunion()).isEqualTo("Rue du Groupe 12");
        assertThat(response.getCommune()).isEqualTo("Bruxelles");
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(referent1),
                org.mockito.ArgumentMatchers.eq("GROUP_UPDATED"),
                org.mockito.ArgumentMatchers.eq("GROUP"),
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.eq("Groupe Numerique V2"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Groupe modifie."),
                org.mockito.ArgumentMatchers.contains("\"capaciteMax\""));
    }

    @Test
    @DisplayName("Un echec AuditLog ne bloque pas la modification d'un groupe")
    void echec_audit_ne_bloque_pas_modification_groupe() {
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeDeReferent1));
        when(userRepository.findByEmail("referent1@test.be")).thenReturn(Optional.of(referent1));
        when(groupeRepository.save(groupeDeReferent1)).thenReturn(groupeDeReferent1);
        doThrow(new RuntimeException("Audit indisponible")).when(auditLogService).logAction(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq("GROUP_UPDATED"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());

        GroupeRequest request = new GroupeRequest();
        request.setNom("Groupe Numerique V3");

        var response = groupeService.modifierGroupe(10L, request, "referent1@test.be");

        assertThat(response.getNom()).isEqualTo("Groupe Numerique V3");
        verify(groupeRepository).save(groupeDeReferent1);
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
        request.setAdresseReunion("Rue Admin 5");
        request.setCommune("Ixelles");
        request.setLatitude(new BigDecimal("50.8333000"));
        request.setLongitude(new BigDecimal("4.3667000"));

        var response = groupeService.creerGroupeParAdmin(request);

        assertThat(response.getAdresseReunion()).isEqualTo("Rue Admin 5");
        assertThat(response.getCommune()).isEqualTo("Ixelles");

        org.mockito.Mockito.verify(groupeRepository).save(
                org.mockito.ArgumentMatchers.argThat(groupe ->
                        groupe.getReferent().getId().equals(1L)
                                && groupe.getStatut() == StatutGroupe.VALIDE
                                && groupe.isActif()
                                && "Rue Admin 5".equals(groupe.getAdresseReunion()))
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
    @DisplayName("Un membre ne peut pas avoir deux demandes en attente")
    void membre_ne_peut_pas_avoir_deux_demandes_en_attente() {
        User membre = new User();
        membre.setId(99L);
        membre.setPrenom("Jean");
        membre.setNom("Dupont");
        membre.setEmail("jean@test.be");
        membre.setRole(Role.MEMBRE);

        MembreGroupe demandeExistante = new MembreGroupe();
        demandeExistante.setId(101L);
        demandeExistante.setUser(membre);
        demandeExistante.setGroupe(groupeDeReferent1);
        demandeExistante.setStatut(StatutMembre.EN_ATTENTE);

        when(userRepository.findByEmail("jean@test.be")).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.estDejaMembreActif(99L)).thenReturn(false);
        when(membreGroupeRepository.findFirstByUserIdAndStatut(99L, StatutMembre.EN_ATTENTE))
                .thenReturn(Optional.of(demandeExistante));

        assertThatThrownBy(() -> groupeService.rejoindreGroupe(20L, "jean@test.be"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("demande d'adhesion en attente");

        verify(membreGroupeRepository, never()).save(any(MembreGroupe.class));
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
    @DisplayName("Accepter une adhesion journalise le changement de statut")
    void accepter_adhesion_journalise_changement_statut() {
        User membre = new User();
        membre.setId(99L);
        membre.setPrenom("Jean");
        membre.setNom("Dupont");
        membre.setEmail("jean@test.be");

        MembreGroupe demande = new MembreGroupe();
        demande.setId(100L);
        demande.setGroupe(groupeDeReferent1);
        demande.setUser(membre);
        demande.setStatut(StatutMembre.EN_ATTENTE);

        when(membreGroupeRepository.findById(100L)).thenReturn(Optional.of(demande));
        when(userRepository.findByEmail("referent1@test.be")).thenReturn(Optional.of(referent1));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(99L, StatutMembre.ACCEPTE))
                .thenReturn(Optional.empty());
        when(membreGroupeRepository.save(demande)).thenReturn(demande);

        groupeService.accepterAdhesion(100L, "referent1@test.be");

        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(referent1),
                org.mockito.ArgumentMatchers.eq("GROUP_ADHESION_ACCEPTED"),
                org.mockito.ArgumentMatchers.eq("GROUP"),
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.eq("Groupe Numerique"),
                org.mockito.ArgumentMatchers.eq("EN_ATTENTE"),
                org.mockito.ArgumentMatchers.eq("ACCEPTE"),
                org.mockito.ArgumentMatchers.eq("Adhesion acceptee."),
                org.mockito.ArgumentMatchers.contains("\"adhesionId\":100"));
    }

    @Test
    @DisplayName("Un membre deja accepte dans un groupe ne peut pas etre accepte dans un second groupe")
    void membre_deja_accepte_ne_peut_pas_etre_accepte_dans_second_groupe() {
        User membre = new User();
        membre.setId(99L);
        membre.setPrenom("Jean");
        membre.setNom("Dupont");
        membre.setEmail("jean@test.be");

        Groupe groupe2 = new Groupe();
        groupe2.setId(20L);
        groupe2.setNom("Groupe Solidaire");
        groupe2.setReferent(referent1);
        groupe2.setStatut(StatutGroupe.VALIDE);

        MembreGroupe demande = new MembreGroupe();
        demande.setId(100L);
        demande.setGroupe(groupe2);
        demande.setUser(membre);
        demande.setStatut(StatutMembre.EN_ATTENTE);

        MembreGroupe adhesionActive = new MembreGroupe();
        adhesionActive.setId(101L);
        adhesionActive.setGroupe(groupeDeReferent1);
        adhesionActive.setUser(membre);
        adhesionActive.setStatut(StatutMembre.ACCEPTE);

        when(membreGroupeRepository.findById(100L)).thenReturn(Optional.of(demande));
        when(userRepository.findByEmail("referent1@test.be")).thenReturn(Optional.of(referent1));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(99L, StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesionActive));

        assertThatThrownBy(() -> groupeService.accepterAdhesion(100L, "referent1@test.be"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("deja a un groupe actif");

        verify(membreGroupeRepository, never()).save(any(MembreGroupe.class));
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
