package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.CommentaireRequest;
import com.bxjeunes.bx_connect.dto.ProjetRequest;
import com.bxjeunes.bx_connect.dto.ProjetResponse;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.ParticipationProjet;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutMembre;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.entity.VisibiliteProjet;
import com.bxjeunes.bx_connect.repository.CommentaireProjetRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.ParticipationProjetRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.NotificationService;
import com.bxjeunes.bx_connect.service.ProjetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ProjetSecurityTest {

    @Mock private ProjetRepository projetRepository;
    @Mock private ParticipationProjetRepository participationRepository;
    @Mock private CommentaireProjetRepository commentaireRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;
    @Mock private NotificationService notificationService;
    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private ProjetService projetService;

    private User admin;
    private User membre;
    private User superAdmin;
    private User referent;
    private User referentAutreGroupe;
    private Groupe groupe;
    private Groupe autreGroupe;

    @BeforeEach
    void setUp() {
        admin = user(1L, "admin@test.be", Role.ADMIN);
        membre = user(2L, "membre@test.be", Role.MEMBRE);
        referent = user(3L, "referent@test.be", Role.REFERENT);
        superAdmin = user(4L, "super@test.be", Role.SUPER_ADMIN);
        referentAutreGroupe = user(5L, "referent2@test.be", Role.REFERENT);

        groupe = new Groupe();
        groupe.setId(10L);
        groupe.setNom("Groupe Creatif");
        groupe.setReferent(referent);

        autreGroupe = new Groupe();
        autreGroupe.setId(20L);
        autreGroupe.setNom("Groupe Solidaire");
        autreGroupe.setReferent(referentAutreGroupe);
    }

    @Test
    @DisplayName("ADMIN peut creer un projet institutionnel sans groupe actif")
    void admin_peut_creer_projet_institutionnel() {
        ProjetRequest request = request();
        request.setVisibilite(VisibiliteProjet.PUBLIC);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> {
            Projet projet = inv.getArgument(0);
            projet.setId(77L);
            return projet;
        });

        assertThat(projetService.proposerProjet(request, admin.getEmail()).getGroupeNom()).isNull();
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("PROJECT_CREATED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.eq(77L),
                org.mockito.ArgumentMatchers.eq("Projet institutionnel"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("BROUILLON"),
                org.mockito.ArgumentMatchers.eq("Projet cree."),
                org.mockito.ArgumentMatchers.contains("\"porteurId\":1"));
    }

    @Test
    @DisplayName("Liste admin paginee des projets utilise Pageable et pas findAll complet")
    void projets_admin_pages_utilisent_pageable() {
        Projet projet = projet(99L, StatutProjet.SOUMIS, groupe, membre);
        when(projetRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(projet)));

        var response = projetService.listerTousProjetsPage(-2, 500);

        assertThat(response.content()).hasSize(1);
        verify(projetRepository, never()).findAll();
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(projetRepository).findAll(captor.capture());
        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(100);
        assertThat(captor.getValue().getSort().getOrderFor("dateCreation").isDescending()).isTrue();
    }

    @Test
    @DisplayName("MEMBRE sans groupe actif ne peut pas proposer un projet")
    void membre_sans_groupe_ne_peut_pas_proposer_projet() {
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> projetService.proposerProjet(request(), membre.getEmail()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("accepte dans un groupe");
    }

    @Test
    @DisplayName("MEMBRE accepte cree un projet rattache a son groupe actif")
    void membre_accepte_cree_projet_groupe() {
        MembreGroupe adhesion = new MembreGroupe();
        adhesion.setUser(membre);
        adhesion.setGroupe(groupe);
        adhesion.setStatut(StatutMembre.ACCEPTE);

        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(projetService.proposerProjet(request(), membre.getEmail()).getGroupeNom())
                .isEqualTo("Groupe Creatif");
    }

    @Test
    @DisplayName("REFERENT ne voit que les projets de ses groupes")
    void referent_ne_voit_que_projets_groupes() {
        Projet projet = new Projet();
        projet.setId(99L);
        projet.setTitre("Projet groupe");
        projet.setPorteur(membre);
        projet.setGroupe(groupe);

        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(projetRepository.findByGroupeReferentEmail(referent.getEmail())).thenReturn(List.of(projet));

        assertThat(projetService.projetsGroupesReferent(referent.getEmail())).hasSize(1);
    }

    @Test
    @DisplayName("VISITEUR ne liste que les projets PUBLIC diffusables")
    void visiteur_ne_liste_que_projets_publics() {
        Projet projetPublic = projet(40L, StatutProjet.APPROUVE, null, admin);
        projetPublic.setVisibilite(VisibiliteProjet.PUBLIC);
        when(projetRepository.findByStatutInAndVisibilite(
                List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE),
                VisibiliteProjet.PUBLIC)).thenReturn(List.of(projetPublic));

        assertThat(projetService.listerProjetsVisibles(null)).extracting(ProjetResponse::getId)
                .containsExactly(40L);
    }

    @Test
    @DisplayName("REFERENT peut creer un projet uniquement pour son groupe")
    void referent_cree_uniquement_pour_son_groupe() {
        ProjetRequest request = request();
        request.setGroupeId(groupe.getId());
        request.setVisibilite(VisibiliteProjet.COMMUNAUTE);

        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(groupeRepository.findById(groupe.getId())).thenReturn(Optional.of(groupe));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(projetService.proposerProjet(request, referent.getEmail()).getGroupeId())
                .isEqualTo(groupe.getId());

        request.setGroupeId(autreGroupe.getId());
        when(groupeRepository.findById(autreGroupe.getId())).thenReturn(Optional.of(autreGroupe));
        assertThatThrownBy(() -> projetService.proposerProjet(request, referent.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("REFERENT peut modifier un projet de son groupe")
    void referent_peut_modifier_projet_de_son_groupe() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, groupe, membre);
        ProjetRequest request = request();
        request.setTitre("Projet modifie");
        request.setGroupeId(groupe.getId());
        request.setVisibilite(VisibiliteProjet.COMMUNAUTE);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(groupeRepository.findById(groupe.getId())).thenReturn(Optional.of(groupe));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjetResponse response = projetService.modifierProjetReferent(42L, request, referent.getEmail());

        assertThat(response.getTitre()).isEqualTo("Projet modifie");
        assertThat(response.getGroupeId()).isEqualTo(groupe.getId());
        assertThat(response.getVisibilite()).isEqualTo(VisibiliteProjet.COMMUNAUTE);
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(referent),
                org.mockito.ArgumentMatchers.eq("PROJECT_UPDATED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.eq(42L),
                org.mockito.ArgumentMatchers.eq("Projet modifie"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Projet modifie par referent."),
                org.mockito.ArgumentMatchers.contains("\"groupeId\":10"));
    }

    @Test
    @DisplayName("Soumettre un projet journalise le changement de statut")
    void soumettre_projet_journalise_changement_statut() {
        Projet projet = projet(42L, StatutProjet.BROUILLON, groupe, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.save(projet)).thenReturn(projet);
        when(userRepository.findByRoleAndActifTrue(Role.ADMIN)).thenReturn(List.of(admin));

        projetService.soumettreProjet(42L, membre.getEmail());

        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(membre),
                org.mockito.ArgumentMatchers.eq("PROJECT_SUBMITTED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.eq(42L),
                org.mockito.ArgumentMatchers.eq("Projet test"),
                org.mockito.ArgumentMatchers.eq("BROUILLON"),
                org.mockito.ArgumentMatchers.eq("SOUMIS"),
                org.mockito.ArgumentMatchers.eq("Projet soumis pour validation."),
                org.mockito.ArgumentMatchers.contains("\"porteurId\":2"));
    }

    @Test
    @DisplayName("Valider et refuser un projet journalisent la decision admin")
    void valider_refuser_projet_journalisent_decision_admin() {
        Projet projetApprouve = projet(42L, StatutProjet.VALIDE_REFERENT, groupe, membre);
        when(projetRepository.findById(42L)).thenReturn(Optional.of(projetApprouve));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(projetRepository.save(projetApprouve)).thenReturn(projetApprouve);

        projetService.validerProjet(42L, true, "ok", admin.getEmail());

        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("PROJECT_APPROVED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.eq(42L),
                org.mockito.ArgumentMatchers.eq("Projet test"),
                org.mockito.ArgumentMatchers.eq("VALIDE_REFERENT"),
                org.mockito.ArgumentMatchers.eq("APPROUVE"),
                org.mockito.ArgumentMatchers.eq("Projet approuve."),
                org.mockito.ArgumentMatchers.contains("\"groupeId\":10"));

        Projet projetRejete = projet(43L, StatutProjet.VALIDE_REFERENT, groupe, membre);
        when(projetRepository.findById(43L)).thenReturn(Optional.of(projetRejete));
        when(projetRepository.save(projetRejete)).thenReturn(projetRejete);

        projetService.validerProjet(43L, false, "non", admin.getEmail());

        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("PROJECT_REJECTED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.eq(43L),
                org.mockito.ArgumentMatchers.eq("Projet test"),
                org.mockito.ArgumentMatchers.eq("VALIDE_REFERENT"),
                org.mockito.ArgumentMatchers.eq("REJETE"),
                org.mockito.ArgumentMatchers.eq("Projet rejete."),
                org.mockito.ArgumentMatchers.contains("\"groupeId\":10"));
    }

    @Test
    @DisplayName("ADMIN peut encore valider temporairement un ancien projet SOUMIS")
    void admin_valide_ancien_projet_soumis_compatibilite_transition() {
        Projet projet = projet(44L, StatutProjet.SOUMIS, groupe, membre);
        when(projetRepository.findById(44L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(projetRepository.save(projet)).thenReturn(projet);

        ProjetResponse response = projetService.validerProjet(44L, true, "transition", admin.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutProjet.APPROUVE);
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("PROJECT_APPROVED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.eq(44L),
                org.mockito.ArgumentMatchers.eq("Projet test"),
                org.mockito.ArgumentMatchers.eq("SOUMIS"),
                org.mockito.ArgumentMatchers.eq("APPROUVE"),
                org.mockito.ArgumentMatchers.eq("Projet approuve."),
                org.mockito.ArgumentMatchers.contains("\"groupeId\":10"));
    }

    @Test
    @DisplayName("REFERENT valide un projet de son groupe sans approbation finale")
    void referent_valide_projet_de_son_groupe_sans_approbation_finale() {
        Projet projet = projet(45L, StatutProjet.SOUMIS, groupe, membre);
        when(projetRepository.findById(45L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(userRepository.findByRoleAndActifTrue(Role.ADMIN)).thenReturn(List.of(admin));
        when(projetRepository.save(projet)).thenReturn(projet);

        ProjetResponse response = projetService.validerProjetReferent(45L, "ok terrain", referent.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutProjet.VALIDE_REFERENT);
        assertThat(response.getCommentaireReferent()).isEqualTo("ok terrain");
        assertThat(response.getReferentValidateurId()).isEqualTo(referent.getId());
        assertThat(response.getDateValidationReferent()).isNotNull();
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(referent),
                org.mockito.ArgumentMatchers.eq("PROJECT_REFERENT_APPROVED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.eq(45L),
                org.mockito.ArgumentMatchers.eq("Projet test"),
                org.mockito.ArgumentMatchers.eq("SOUMIS"),
                org.mockito.ArgumentMatchers.eq("VALIDE_REFERENT"),
                org.mockito.ArgumentMatchers.eq("Projet valide par referent."),
                org.mockito.ArgumentMatchers.contains("\"groupeId\":10"));
    }

    @Test
    @DisplayName("REFERENT refuse un projet avec commentaire")
    void referent_refuse_projet_avec_commentaire() {
        Projet projet = projet(46L, StatutProjet.SOUMIS, groupe, membre);
        when(projetRepository.findById(46L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(projetRepository.save(projet)).thenReturn(projet);

        ProjetResponse response = projetService.refuserProjetReferent(46L, "budget a revoir", referent.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutProjet.REFUSE_REFERENT);
        assertThat(response.getCommentaireReferent()).isEqualTo("budget a revoir");
        assertThat(response.getDateRefusReferent()).isNotNull();
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(referent),
                org.mockito.ArgumentMatchers.eq("PROJECT_REFERENT_REJECTED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.eq(46L),
                org.mockito.ArgumentMatchers.eq("Projet test"),
                org.mockito.ArgumentMatchers.eq("SOUMIS"),
                org.mockito.ArgumentMatchers.eq("REFUSE_REFERENT"),
                org.mockito.ArgumentMatchers.eq("Projet refuse par referent."),
                org.mockito.ArgumentMatchers.contains("\"groupeId\":10"));
    }

    @Test
    @DisplayName("REFERENT ne peut pas valider un projet hors perimetre")
    void referent_ne_peut_pas_valider_projet_hors_perimetre() {
        Projet projet = projet(47L, StatutProjet.SOUMIS, autreGroupe, membre);
        when(projetRepository.findById(47L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));

        assertThatThrownBy(() -> projetService.validerProjetReferent(47L, "ok", referent.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("PARTENAIRE ne peut pas utiliser la validation referent au service")
    void partenaire_ne_peut_pas_valider_comme_referent() {
        User partenaire = user(7L, "partenaire@test.be", Role.PARTENAIRE);
        Projet projet = projet(48L, StatutProjet.SOUMIS, groupe, membre);
        when(projetRepository.findById(48L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));

        assertThatThrownBy(() -> projetService.validerProjetReferent(48L, "ok", partenaire.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("File admin contient les projets valides referent et les anciens soumis")
    void file_admin_contient_valides_referent_et_anciens_soumis() {
        Projet valideReferent = projet(49L, StatutProjet.VALIDE_REFERENT, groupe, membre);
        Projet ancienSoumis = projet(50L, StatutProjet.SOUMIS, groupe, membre);
        when(projetRepository.findByStatutIn(List.of(StatutProjet.VALIDE_REFERENT, StatutProjet.SOUMIS)))
                .thenReturn(List.of(valideReferent, ancienSoumis));

        assertThat(projetService.projetsSoumis())
                .extracting(ProjetResponse::getStatut)
                .containsExactly(StatutProjet.VALIDE_REFERENT, StatutProjet.SOUMIS);
    }

    @Test
    @DisplayName("Un echec AuditLog ne bloque pas la modification d'un projet")
    void echec_audit_ne_bloque_pas_modification_projet() {
        Projet projet = projet(42L, StatutProjet.BROUILLON, groupe, membre);
        ProjetRequest request = request();
        request.setTitre("Projet malgre audit KO");
        request.setVisibilite(VisibiliteProjet.GROUPE);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.save(projet)).thenReturn(projet);
        doThrow(new RuntimeException("Audit indisponible")).when(auditLogService).logAction(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq("PROJECT_UPDATED"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());

        ProjetResponse response = projetService.modifierProjet(42L, request, membre.getEmail());

        assertThat(response.getTitre()).isEqualTo("Projet malgre audit KO");
        verify(projetRepository).save(projet);
    }

    @Test
    @DisplayName("REFERENT ne peut pas modifier un projet d'un autre groupe")
    void referent_ne_peut_pas_modifier_projet_autre_groupe() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, autreGroupe, membre);
        ProjetRequest request = request();
        request.setGroupeId(autreGroupe.getId());

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));

        assertThatThrownBy(() -> projetService.modifierProjetReferent(42L, request, referent.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MEMBRE ne peut pas utiliser la modification referent")
    void membre_ne_peut_pas_modifier_projet_comme_referent() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, groupe, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));

        assertThatThrownBy(() -> projetService.modifierProjetReferent(42L, request(), membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("ADMIN peut rattacher un projet au groupe demande")
    void admin_peut_rattacher_projet_au_groupe() {
        ProjetRequest request = request();
        request.setGroupeId(groupe.getId());
        request.setVisibilite(VisibiliteProjet.GROUPE);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(groupeRepository.findById(groupe.getId())).thenReturn(Optional.of(groupe));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(projetService.proposerProjet(request, admin.getEmail()).getGroupeId())
                .isEqualTo(groupe.getId());
        verify(groupeRepository).findById(groupe.getId());
    }

    @Test
    @DisplayName("Projet brouillon invisible publiquement")
    void projet_brouillon_invisible_publiquement() {
        assertProjetNonPublicInvisible(StatutProjet.BROUILLON);
    }

    @Test
    @DisplayName("Projet rejete invisible publiquement")
    void projet_rejete_invisible_publiquement() {
        assertProjetNonPublicInvisible(StatutProjet.REJETE);
    }

    @Test
    @DisplayName("Projet archive invisible publiquement")
    void projet_archive_invisible_publiquement() {
        assertProjetNonPublicInvisible(StatutProjet.ARCHIVE);
    }

    @Test
    @DisplayName("MEMBRE groupe A interdit sur projet du groupe B")
    void membre_groupe_a_interdit_sur_projet_groupe_b() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, autreGroupe, user(6L, "porteur@test.be", Role.MEMBRE));

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membre, groupe)));

        assertThatThrownBy(() -> projetService.getProjet(42L, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("REFERENT groupe A interdit sur projet du groupe B")
    void referent_groupe_a_interdit_sur_projet_groupe_b() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, autreGroupe, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));

        assertThatThrownBy(() -> projetService.getProjet(42L, referent.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("ADMIN autorise sur projet non public")
    void admin_autorise_sur_projet_non_public() {
        Projet projet = projet(42L, StatutProjet.BROUILLON, null, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        assertThat(projetService.getProjet(42L, admin.getEmail()).getId()).isEqualTo(42L);
    }

    @Test
    @DisplayName("SUPER_ADMIN peut consulter les projets sans action metier")
    void super_admin_peut_consulter_les_projets() {
        Projet projetPublic = projet(42L, StatutProjet.APPROUVE, null, membre);
        projetPublic.setVisibilite(VisibiliteProjet.PUBLIC);
        Projet projetPrive = projet(43L, StatutProjet.SOUMIS, groupe, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projetPublic));
        when(projetRepository.findById(43L)).thenReturn(Optional.of(projetPrive));
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));

        assertThat(projetService.getProjet(42L, superAdmin.getEmail()).getId()).isEqualTo(42L);
        assertThat(projetService.getProjet(43L, superAdmin.getEmail()).getId()).isEqualTo(43L);
    }

    @Test
    @DisplayName("Commentaires soumis aux memes regles d'acces")
    void commentaires_soumis_aux_memes_regles() {
        Projet projetAutreGroupe = projet(42L, StatutProjet.SOUMIS, autreGroupe, user(6L, "porteur@test.be", Role.MEMBRE));
        CommentaireRequest commentaireRequest = new CommentaireRequest();
        commentaireRequest.setContenu("Commentaire");

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projetAutreGroupe));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membre, groupe)));

        assertThatThrownBy(() -> projetService.getCommentaires(42L, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> projetService.commenterProjet(42L, commentaireRequest, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("MEMBRE peut rejoindre uniquement un projet de son groupe actif")
    void membre_peut_rejoindre_projet_groupe_actif() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, groupe, user(6L, "porteur@test.be", Role.MEMBRE));

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membre, groupe)));
        when(participationRepository.existsByUserIdAndProjetId(membre.getId(), 42L)).thenReturn(false);
        when(participationRepository.save(any(ParticipationProjet.class))).thenAnswer(inv -> inv.getArgument(0));

        projetService.rejoindrProjet(42L, membre.getEmail());
    }

    @Test
    @DisplayName("rejoindreProjet refuse les roles non MEMBRE au service")
    void rejoindre_projet_refuse_roles_non_membre_service() {
        Projet projet = projet(42L, StatutProjet.APPROUVE, groupe, membre);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> projetService.rejoindrProjet(42L, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    private ProjetRequest request() {
        ProjetRequest request = new ProjetRequest();
        request.setTitre("Projet institutionnel");
        request.setDescription("Description");
        return request;
    }

    private void assertProjetNonPublicInvisible(StatutProjet statut) {
        Projet projet = projet(42L, statut, groupe, membre);
        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));

        assertThatThrownBy(() -> projetService.getProjet(42L))
                .isInstanceOf(AccessDeniedException.class);
    }

    private Projet projet(Long id, StatutProjet statut, Groupe groupe, User porteur) {
        Projet projet = new Projet();
        projet.setId(id);
        projet.setTitre("Projet test");
        projet.setDescription("Description");
        projet.setStatut(statut);
        projet.setGroupe(groupe);
        projet.setPorteur(porteur);
        return projet;
    }

    private MembreGroupe adhesion(User user, Groupe groupe) {
        MembreGroupe adhesion = new MembreGroupe();
        adhesion.setUser(user);
        adhesion.setGroupe(groupe);
        adhesion.setStatut(StatutMembre.ACCEPTE);
        return adhesion;
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPrenom("Test");
        user.setNom("User");
        user.setRole(role);
        user.setActif(true);
        user.setMotDePasse("secret");
        return user;
    }
}
