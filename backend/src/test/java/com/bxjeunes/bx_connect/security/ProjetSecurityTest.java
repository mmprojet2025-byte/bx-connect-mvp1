package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.CommentaireRequest;
import com.bxjeunes.bx_connect.dto.ProjetRequest;
import com.bxjeunes.bx_connect.dto.ProjetResponse;
import com.bxjeunes.bx_connect.dto.ProjetReviewResponse;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;

@ExtendWith(MockitoExtension.class)
class ProjetSecurityTest {

    @Test
    @DisplayName("Le DTO projet general n'expose aucune donnee interne de workflow")
    void dto_projet_general_masque_donnees_internes() {
        assertThat(Arrays.stream(ProjetResponse.class.getDeclaredFields()).map(java.lang.reflect.Field::getName))
                .doesNotContain("justificationAdmin", "bilan", "version", "porteurId",
                        "commentaireAdmin", "commentaireReferent", "referentValidateurId");
    }

    @Test
    @DisplayName("Le detail administratif expose justification et bilan seulement a ADMIN")
    void detail_administratif_est_reserve_admin() {
        Projet projet = projet(90L, StatutProjet.TERMINE, groupe, membre);
        projet.setJustificationAdmin("Justification interne");
        projet.setBilan("Bilan interne");
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(projetRepository.findById(90L)).thenReturn(Optional.of(projet));

        var response = projetService.getProjetAdmin(90L, admin.getEmail());

        assertThat(response.justificationAdmin()).isEqualTo("Justification interne");
        assertThat(response.bilan()).isEqualTo("Bilan interne");
        assertThat(response.projet().getId()).isEqualTo(90L);
    }

    @Test
    @DisplayName("Le detail administratif refuse les autres roles avant lecture projet")
    void detail_administratif_refuse_non_admin_avant_projet() {
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));

        assertThatThrownBy(() -> projetService.getProjetAdmin(90L, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(projetRepository);
    }


    @ParameterizedTest
    @CsvSource({"PUBLIC,APPROUVE", "PUBLIC,EN_COURS"})
    void membre_sans_groupe_rejoint_public(VisibiliteProjet type, StatutProjet statut) {
        Projet p = projet(42L, statut, null, admin);
        p.setVisibilite(type);
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(p));
        projetService.rejoindrProjet(42L, membre.getEmail());
        verify(participationRepository).save(any(ParticipationProjet.class));
        verifyNoInteractions(membreGroupeRepository);
    }

    @ParameterizedTest
    @CsvSource({"PUBLIC,BROUILLON", "PUBLIC,SOUMIS", "PUBLIC,VALIDE_REFERENT",
        "PUBLIC,TERMINE", "PUBLIC,ARCHIVE", "GROUPE,BROUILLON", "GROUPE,TERMINE"})
    void pas_de_participation_hors_projet_ouvert(VisibiliteProjet type, StatutProjet statut) {
        Projet p = projet(42L, statut, groupe, membre);
        p.setVisibilite(type);
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(p));
        assertThatThrownBy(() -> projetService.rejoindrProjet(42L, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(participationRepository, never()).save(any());
    }

    @Test
    void membre_autre_groupe_voit_catalogue_mais_ne_rejoint_pas() {
        Projet p = projet(42L, StatutProjet.APPROUVE, autreGroupe, admin);
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(p));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membre, groupe)));
        when(projetRepository.findById(42L)).thenReturn(Optional.of(p));
        assertThat(projetService.getProjet(42L, membre.getEmail()).getId()).isEqualTo(42L);
        assertThatThrownBy(() -> projetService.rejoindrProjet(42L, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(participationRepository, never()).save(any());
    }

    @ParameterizedTest
    @CsvSource({"GROUPE,APPROUVE", "GROUPE,EN_COURS", "GROUPE,TERMINE",
        "PUBLIC,APPROUVE", "PUBLIC,EN_COURS", "PUBLIC,TERMINE"})
    void visiteur_consulte_les_deux_types_diffusables(VisibiliteProjet type, StatutProjet statut) {
        Projet p = projet(42L, statut, groupe, membre);
        p.setVisibilite(type);
        when(projetRepository.findById(42L)).thenReturn(Optional.of(p));
        assertThat(projetService.getProjet(42L).getId()).isEqualTo(42L);
    }

    @Test
    void catalogue_ne_revele_pas_discussion_interne_du_groupe() {
        Projet p = projet(42L, StatutProjet.APPROUVE, groupe, membre);
        when(projetRepository.findById(42L)).thenReturn(Optional.of(p));
        assertThatThrownBy(() -> projetService.getCommentaires(42L, null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> projetService.getCommentairesPage(42L, null, 0, 20))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(commentaireRepository);
    }

    @Test
    void participation_publique_ne_peut_pas_etre_dupliquee() {
        Projet p = projet(42L, StatutProjet.APPROUVE, null, admin);
        p.setVisibilite(VisibiliteProjet.PUBLIC);
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(p));
        when(participationRepository.existsByUserIdAndProjetId(membre.getId(), 42L)).thenReturn(true);
        assertThatThrownBy(() -> projetService.rejoindrProjet(42L, membre.getEmail()))
                .hasMessage("Vous participez déjà à ce projet");
        verify(participationRepository, never()).save(any());
    }


    @ParameterizedTest
    @CsvSource({"COMMUNAUTE", "PARTENAIRES"})
    void anciens_types_refuses_pour_les_nouvelles_creations(VisibiliteProjet type) {
        ProjetRequest request = request();
        request.setVisibilite(type);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        assertThatThrownBy(() -> projetService.proposerProjet(request, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(projetRepository, never()).save(any());
    }

    @Test
    void membre_sans_adhesion_active_ne_rejoint_pas_groupe() {
        Projet p = projet(42L, StatutProjet.APPROUVE, groupe, admin);
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(p));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(membre.getId(), StatutMembre.ACCEPTE))
                .thenReturn(Optional.empty());
        assertThatThrownBy(() -> projetService.rejoindrProjet(42L, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(participationRepository, never()).save(any());
    }


    @Test
    void paiement_obligatoire_ne_peut_pas_etre_contourne_par_rejoindre() {
        Projet p = projet(42L, StatutProjet.APPROUVE, null, membre);
        p.setVisibilite(VisibiliteProjet.PUBLIC);
        p.setPrixParticipation(new java.math.BigDecimal("5.00"));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(p));
        assertThatThrownBy(() -> projetService.rejoindrProjet(42L, membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class).hasMessageContaining("paiement");
        verify(participationRepository, never()).save(any());
    }

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
        groupe.setActif(true);
        groupe.setStatut(com.bxjeunes.bx_connect.entity.StatutGroupe.VALIDE);

        autreGroupe = new Groupe();
        autreGroupe.setId(20L);
        autreGroupe.setNom("Groupe Solidaire");
        autreGroupe.setReferent(referentAutreGroupe);
        autreGroupe.setActif(true);
        autreGroupe.setStatut(com.bxjeunes.bx_connect.entity.StatutGroupe.VALIDE);
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
        assertThatThrownBy(() -> projetService.proposerProjet(request(), membre.getEmail()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("choisi explicitement");
    }

    @Test
    @DisplayName("MEMBRE accepte cree un projet rattache a son groupe actif")
    void membre_accepte_cree_projet_groupe() {
        MembreGroupe adhesion = new MembreGroupe();
        adhesion.setUser(membre);
        adhesion.setGroupe(groupe);
        adhesion.setStatut(StatutMembre.ACCEPTE);

        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        ProjetRequest request = request();
        request.setGroupeId(groupe.getId());
        when(membreGroupeRepository.findByUserIdAndGroupeId(membre.getId(), groupe.getId()))
                .thenReturn(Optional.of(adhesion));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(projetService.proposerProjet(request, membre.getEmail()).getGroupeNom())
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
    @DisplayName("VISITEUR liste les projets GROUPE et PUBLIC diffusables")
    void visiteur_liste_les_deux_types() {
        Projet projetPublic = projet(40L, StatutProjet.APPROUVE, null, admin);
        projetPublic.setVisibilite(VisibiliteProjet.PUBLIC);
        Projet projetGroupe = projet(41L, StatutProjet.TERMINE, groupe, membre);
        when(projetRepository.findByStatutInAndVisibiliteIn(
                List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE),
                List.of(VisibiliteProjet.GROUPE, VisibiliteProjet.PUBLIC))).thenReturn(List.of(projetPublic, projetGroupe));

        assertThat(projetService.listerProjetsVisibles(null)).extracting(ProjetResponse::getId)
                .containsExactly(40L, 41L);
    }

    @Test
    @DisplayName("REFERENT peut creer un projet uniquement pour son groupe")
    void referent_cree_uniquement_pour_son_groupe() {
        ProjetRequest request = request();
        request.setGroupeId(groupe.getId());
        request.setVisibilite(VisibiliteProjet.PUBLIC);

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
    @DisplayName("REFERENT porteur peut modifier son brouillon")
    void referent_peut_modifier_projet_de_son_groupe() {
        Projet projet = projet(42L, StatutProjet.BROUILLON, groupe, referent);
        ProjetRequest request = request();
        request.setTitre("Projet modifie");
        request.setGroupeId(groupe.getId());
        request.setVisibilite(VisibiliteProjet.PUBLIC);

        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(groupeRepository.findById(groupe.getId())).thenReturn(Optional.of(groupe));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));

        ProjetResponse response = projetService.modifierProjetReferent(42L, request, referent.getEmail());

        assertThat(response.getTitre()).isEqualTo("Projet modifie");
        assertThat(response.getGroupeId()).isEqualTo(groupe.getId());
        assertThat(response.getVisibilite()).isEqualTo(VisibiliteProjet.PUBLIC);
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
    @DisplayName("ADMIN ne peut pas contourner la validation REFERENT depuis SOUMIS")
    void admin_ne_valide_pas_directement_un_projet_soumis() {
        Projet projet = projet(44L, StatutProjet.SOUMIS, groupe, membre);
        when(projetRepository.findById(44L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> projetService.validerProjet(44L, true, "transition", admin.getEmail()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("validation administrative");
        verify(projetRepository, never()).save(any());
        verifyNoInteractions(notificationService, auditLogService);
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
        ProjetReviewResponse review = (ProjetReviewResponse) response;
        assertThat(review.getCommentaireReferent()).isEqualTo("ok terrain");
        assertThat(review.getReferentValidateurId()).isEqualTo(referent.getId());
        assertThat(review.getDateValidationReferent()).isNotNull();
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
        ProjetReviewResponse review = (ProjetReviewResponse) response;
        assertThat(review.getCommentaireReferent()).isEqualTo("budget a revoir");
        assertThat(review.getDateRefusReferent()).isNotNull();
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
    @DisplayName("File admin contient uniquement les projets valides par referent")
    void file_admin_contient_uniquement_valides_referent() {
        Projet valideReferent = projet(49L, StatutProjet.VALIDE_REFERENT, groupe, membre);
        when(projetRepository.findByStatut(StatutProjet.VALIDE_REFERENT))
                .thenReturn(List.of(valideReferent));

        assertThat(projetService.projetsSoumis())
                .extracting(ProjetResponse::getStatut)
                .containsExactly(StatutProjet.VALIDE_REFERENT);
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
    void referent_corrige_projet_soumis_du_membre_sans_changer_workflow_ou_porteur() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, groupe, membre);
        ProjetRequest request = request(); request.setGroupeId(groupe.getId()); request.setTitre("Titre relu");
        request.setCapacite(12); request.setDateExecution(java.time.LocalDate.of(2030, 5, 5));
        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(groupeRepository.findById(groupe.getId())).thenReturn(Optional.of(groupe));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));
        ProjetResponse response = projetService.modifierProjetReferent(42L, request, referent.getEmail());
        assertThat(response.getTitre()).isEqualTo("Titre relu");
        assertThat(response.getCapacite()).isEqualTo(12);
        assertThat(response.getStatut()).isEqualTo(StatutProjet.SOUMIS);
        assertThat(projet.getPorteur()).isSameAs(membre);
        verifyNoInteractions(notificationService);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.EnumSource(value = StatutProjet.class, names = {"BROUILLON", "VALIDE_REFERENT", "APPROUVE", "EN_COURS", "TERMINE", "A_CORRIGER_ADMIN", "A_CORRIGER_REFERENT"})
    void referent_ne_corrige_pas_le_projet_du_membre_hors_relecture(StatutProjet statut) {
        Projet projet = projet(42L, statut, groupe, membre);
        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        assertThatThrownBy(() -> projetService.modifierProjetReferent(42L, request(), referent.getEmail()))
            .isInstanceOf(AccessDeniedException.class);
        verify(projetRepository, never()).save(any());
    }

    @Test void referent_ne_deplace_pas_le_projet_soumis_vers_un_autre_groupe() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, groupe, membre);
        ProjetRequest request = request(); request.setGroupeId(autreGroupe.getId());
        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        assertThatThrownBy(() -> projetService.modifierProjetReferent(42L, request, referent.getEmail()))
            .isInstanceOf(AccessDeniedException.class);
        verify(projetRepository, never()).save(any());
    }

    @Test void transmission_admin_change_statut_partout_et_refuse_un_second_envoi() {
        Projet projet = projet(42L, StatutProjet.SOUMIS, groupe, membre);
        when(projetRepository.findById(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));
        assertThat(projetService.validerProjetReferent(42L, "Relu", referent.getEmail()).getStatut()).isEqualTo(StatutProjet.VALIDE_REFERENT);
        assertThat(projetService.getProjet(42L, membre.getEmail()).getStatut()).isEqualTo(StatutProjet.VALIDE_REFERENT);
        assertThatThrownBy(() -> projetService.validerProjetReferent(42L, "Relu", referent.getEmail()))
            .hasMessageContaining("SOUMIS");
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
        request.setJustificationAdmin("Projet organise par l'association");
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(groupeRepository.findById(groupe.getId())).thenReturn(Optional.of(groupe));
        when(projetRepository.save(any(Projet.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(projetService.proposerProjet(request, admin.getEmail()).getGroupeId())
                .isEqualTo(groupe.getId());
        verify(groupeRepository).findById(groupe.getId());
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("PROJECT_CREATED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("BROUILLON"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.argThat(metadata -> !metadata.contains("justificationAdmin")
                        && !metadata.contains("Projet organise") && !metadata.contains("budgetDemande")));
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
    @DisplayName("SUPER_ADMIN consulte uniquement un detail public avec la requete publique")
    void super_admin_consulte_uniquement_detail_public() {
        Projet projetPublic = projet(42L, StatutProjet.APPROUVE, null, membre);
        projetPublic.setVisibilite(VisibiliteProjet.PUBLIC);
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));
        when(projetRepository.findByIdAndStatutInAndVisibiliteIn(
                42L,
                List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE),
                List.of(VisibiliteProjet.GROUPE, VisibiliteProjet.PUBLIC))).thenReturn(Optional.of(projetPublic));

        assertThat(projetService.getProjet(42L, superAdmin.getEmail()).getId()).isEqualTo(42L);
        verify(projetRepository, never()).findById(any());
    }

    @Test
    @DisplayName("SUPER_ADMIN ne peut pas reveler un projet prive par son identifiant")
    void super_admin_ne_peut_pas_consulter_detail_prive() {
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));
        when(projetRepository.findByIdAndStatutInAndVisibiliteIn(
                43L,
                List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE),
                List.of(VisibiliteProjet.GROUPE, VisibiliteProjet.PUBLIC))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projetService.getProjet(43L, superAdmin.getEmail()))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Projet introuvable");
        verify(projetRepository, never()).findById(any());
    }

    @Test
    @DisplayName("SUPER_ADMIN liste exactement le catalogue public sans findAll")
    void super_admin_liste_uniquement_catalogue_public() {
        Projet projetPublic = projet(42L, StatutProjet.APPROUVE, null, membre);
        projetPublic.setVisibilite(VisibiliteProjet.PUBLIC);
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));
        when(projetRepository.findByStatutInAndVisibiliteIn(
                List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE),
                List.of(VisibiliteProjet.GROUPE, VisibiliteProjet.PUBLIC))).thenReturn(List.of(projetPublic));

        assertThat(projetService.listerProjetsVisibles(superAdmin.getEmail()))
                .extracting(ProjetResponse::getId)
                .containsExactly(42L);
        verify(projetRepository, never()).findAll();
    }

    @Test
    @DisplayName("SUPER_ADMIN pagine uniquement le catalogue public sans findAll")
    void super_admin_pagine_uniquement_catalogue_public() {
        Projet projetPublic = projet(42L, StatutProjet.TERMINE, null, membre);
        projetPublic.setVisibilite(VisibiliteProjet.PUBLIC);
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));
        when(projetRepository.findByStatutInAndVisibiliteIn(
                org.mockito.ArgumentMatchers.eq(List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS, StatutProjet.TERMINE)),
                org.mockito.ArgumentMatchers.eq(List.of(VisibiliteProjet.GROUPE, VisibiliteProjet.PUBLIC)),
                any(Pageable.class))).thenReturn(new PageImpl<>(List.of(projetPublic)));

        assertThat(projetService.listerProjetsVisiblesPage(superAdmin.getEmail(), 0, 20).content())
                .extracting(ProjetResponse::getId)
                .containsExactly(42L);
        verify(projetRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("SUPER_ADMIN est refuse sur les commentaires avant les repositories projet et commentaire")
    void super_admin_est_refuse_sur_commentaires_avant_repositories_metier() {
        CommentaireRequest request = new CommentaireRequest();
        request.setContenu("Interdit");
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));

        assertThatThrownBy(() -> projetService.commenterProjet(42L, request, superAdmin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> projetService.getCommentaires(42L, superAdmin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> projetService.getCommentairesPage(42L, superAdmin.getEmail(), 0, 20))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, org.mockito.Mockito.times(3)).findByEmail(superAdmin.getEmail());
        verifyNoMoreInteractions(userRepository);
        verifyNoInteractions(projetRepository, commentaireRepository, participationRepository,
                groupeRepository, membreGroupeRepository, notificationService, auditLogService);
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
        Projet projet = projet(42L, StatutProjet.APPROUVE, groupe, user(6L, "porteur@test.be", Role.MEMBRE));

        when(projetRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(projet));
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

        when(projetRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> projetService.rejoindrProjet(42L, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("La soumission d'un projet ADMIN approuve automatiquement et est auditee")
    void soumission_admin_approuve_automatiquement() {
        Projet projet = projet(70L, StatutProjet.BROUILLON, null, admin);
        projet.setVisibilite(VisibiliteProjet.PUBLIC);
        when(projetRepository.findById(70L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(projetRepository.save(projet)).thenReturn(projet);

        ProjetResponse response = projetService.soumettreProjet(70L, admin.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutProjet.APPROUVE);
        assertThat(response.getDateValidation()).isNotNull();
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("PROJECT_ADMIN_AUTO_APPROVED"),
                org.mockito.ArgumentMatchers.eq("PROJECT"),
                org.mockito.ArgumentMatchers.eq(70L),
                org.mockito.ArgumentMatchers.eq("Projet test"),
                org.mockito.ArgumentMatchers.eq("BROUILLON"),
                org.mockito.ArgumentMatchers.eq("APPROUVE"),
                org.mockito.ArgumentMatchers.contains("automatiquement"),
                org.mockito.ArgumentMatchers.contains("\"porteurId\":1"));
        verify(notificationService, never()).creer(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Une correction referent resoumise revient au referent responsable uniquement")
    void correction_referent_resoumise_notifie_referent_responsable() {
        Projet projet = projet(73L, StatutProjet.A_CORRIGER_REFERENT, groupe, membre);
        when(projetRepository.findById(73L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.save(projet)).thenReturn(projet);

        ProjetResponse response = projetService.soumettreProjet(73L, membre.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutProjet.SOUMIS);
        verify(notificationService).creer(org.mockito.ArgumentMatchers.same(referent), any(), any(), any(), any());
        verify(userRepository, never()).findByRoleAndActifTrue(Role.ADMIN);
    }

    @Test
    @DisplayName("Une correction est modifiee puis resoumise sur le meme projet sans doublon")
    void correction_modification_resoumission_conserve_identifiant_et_instance() {
        Projet projet = projet(75L, StatutProjet.A_CORRIGER_REFERENT, groupe, membre);
        projet.setCommentaireReferent("Preciser les objectifs");
        ProjetRequest correction = request();
        correction.setTitre("Projet corrige");
        correction.setVisibilite(VisibiliteProjet.GROUPE);

        when(projetRepository.findById(75L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(projetRepository.save(projet)).thenReturn(projet);

        ProjetResponse modifie = projetService.modifierProjet(75L, correction, membre.getEmail());
        ProjetResponse resoumis = projetService.soumettreProjet(75L, membre.getEmail());

        assertThat(modifie.getId()).isEqualTo(75L);
        assertThat(resoumis.getId()).isEqualTo(75L);
        assertThat(resoumis.getStatut()).isEqualTo(StatutProjet.SOUMIS);
        assertThat(projet.getTitre()).isEqualTo("Projet corrige");
        verify(projetRepository, org.mockito.Mockito.times(2)).save(org.mockito.ArgumentMatchers.same(projet));
    }

    @Test
    @DisplayName("Un autre membre ne peut ni modifier ni resoumettre le projet")
    void autre_membre_ne_modifie_ni_resoumet_projet() {
        User autreMembre = user(9L, "autre@test.be", Role.MEMBRE);
        Projet projet = projet(76L, StatutProjet.A_CORRIGER_REFERENT, groupe, membre);
        when(projetRepository.findById(76L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(autreMembre.getEmail())).thenReturn(Optional.of(autreMembre));

        assertThatThrownBy(() -> projetService.modifierProjet(76L, request(), autreMembre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> projetService.soumettreProjet(76L, autreMembre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(projetRepository, never()).save(any());
    }

    @Test
    @DisplayName("Les projets dans un etat final ne peuvent etre modifies ou resoumis")
    void etats_finaux_bloquent_modification_et_resoumission() {
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        for (StatutProjet statut : List.of(StatutProjet.APPROUVE, StatutProjet.REFUSE_REFERENT,
                StatutProjet.REJETE, StatutProjet.TERMINE, StatutProjet.ANNULE, StatutProjet.ARCHIVE)) {
            Projet projet = projet(100L + statut.ordinal(), statut, groupe, membre);
            when(projetRepository.findById(projet.getId())).thenReturn(Optional.of(projet));

            assertThatThrownBy(() -> projetService.modifierProjet(projet.getId(), request(), membre.getEmail()))
                    .isInstanceOf(RuntimeException.class);
            assertThatThrownBy(() -> projetService.soumettreProjet(projet.getId(), membre.getEmail()))
                    .isInstanceOf(RuntimeException.class);
        }
        verify(projetRepository, never()).save(any());
    }

    @Test
    @DisplayName("Une correction admin resoumise notifie la file ADMIN et le referent validateur sans doublon")
    void correction_admin_resoumise_notifie_admins_et_referent_validateur() {
        Projet projet = projet(74L, StatutProjet.A_CORRIGER_ADMIN, groupe, membre);
        projet.setReferentValidateur(referent);
        when(projetRepository.findById(74L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(userRepository.findByRoleAndActifTrue(Role.ADMIN)).thenReturn(List.of(admin));
        when(projetRepository.save(projet)).thenReturn(projet);

        ProjetResponse response = projetService.soumettreProjet(74L, membre.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutProjet.VALIDE_REFERENT);
        verify(notificationService).creer(org.mockito.ArgumentMatchers.same(admin), any(), any(), any(), any());
        verify(notificationService).creer(org.mockito.ArgumentMatchers.same(referent), any(), any(), any(), any());
        verifyNoMoreInteractions(notificationService);
    }

    @Test
    @DisplayName("Une transition generique interdite ne sauvegarde, n'audite et ne notifie rien")
    void transition_generique_interdite_sans_effet() {
        Projet projet = projet(71L, StatutProjet.BROUILLON, groupe, membre);
        when(projetRepository.findById(71L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> projetService.changerStatut(71L, StatutProjet.TERMINE, admin.getEmail()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Transition de statut interdite");

        verify(projetRepository, never()).save(any());
        verifyNoInteractions(notificationService, auditLogService);
        assertThat(projet.getStatut()).isEqualTo(StatutProjet.BROUILLON);
    }

    @Test
    @DisplayName("Le cycle d'execution ADMIN impose APPROUVE puis EN_COURS puis TERMINE puis ARCHIVE")
    void cycle_execution_admin_est_strict() {
        Projet projet = projet(72L, StatutProjet.APPROUVE, groupe, membre);
        when(projetRepository.findById(72L)).thenReturn(Optional.of(projet));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(projetRepository.save(projet)).thenReturn(projet);

        assertThat(projetService.demarrerProjet(72L, admin.getEmail()).getStatut()).isEqualTo(StatutProjet.EN_COURS);
        assertThat(projetService.terminerProjet(72L, "Bilan final", admin.getEmail()).getStatut()).isEqualTo(StatutProjet.TERMINE);
        assertThat(projetService.archiverProjet(72L, admin.getEmail()).getStatut()).isEqualTo(StatutProjet.ARCHIVE);
        assertThat(projet.getBilan()).isEqualTo("Bilan final");
    }

    @Test
    @DisplayName("Les demandes de correction referent et admin suivent uniquement leurs statuts sources")
    void corrections_referent_et_admin_sont_strictes() {
        Projet soumis = projet(80L, StatutProjet.SOUMIS, groupe, membre);
        Projet valide = projet(81L, StatutProjet.VALIDE_REFERENT, groupe, membre);
        when(projetRepository.findById(80L)).thenReturn(Optional.of(soumis));
        when(projetRepository.findById(81L)).thenReturn(Optional.of(valide));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(projetRepository.save(soumis)).thenReturn(soumis);
        when(projetRepository.save(valide)).thenReturn(valide);

        assertThat(projetService.demanderCorrectionReferent(80L, "Preciser les objectifs", referent.getEmail()).getStatut())
                .isEqualTo(StatutProjet.A_CORRIGER_REFERENT);
        assertThat(projetService.demanderCorrectionAdmin(81L, "Preciser le budget", admin.getEmail()).getStatut())
                .isEqualTo(StatutProjet.A_CORRIGER_ADMIN);
    }

    @ParameterizedTest
    @CsvSource(value = {
            "NULL, Préciser les objectifs",
            "Ancien commentaire, Préciser les objectifs",
            "Ancien commentaire, '  Préciser les objectifs  '"
    }, nullValues = "NULL")
    @DisplayName("BX-02 : la correction referent sauvegarde le nouveau motif et le renvoie au porteur")
    void correction_referent_sauvegarde_et_expose_motif(String ancienCommentaire, String commentaire) {
        Projet soumis = projet(80L, StatutProjet.SOUMIS, groupe, membre);
        soumis.setCommentaireReferent(ancienCommentaire);
        when(projetRepository.findById(80L)).thenReturn(Optional.of(soumis));
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(projetRepository.save(soumis)).thenAnswer(invocation -> {
            Projet sauvegarde = invocation.getArgument(0);
            assertThat(sauvegarde.getStatut()).isEqualTo(StatutProjet.A_CORRIGER_REFERENT);
            assertThat(sauvegarde.getCommentaireReferent()).isEqualTo("Préciser les objectifs");
            return sauvegarde;
        });

        ProjetResponse response = projetService.demanderCorrectionReferent(
                80L, commentaire, referent.getEmail());

        verify(projetRepository).save(soumis);
        assertThat(soumis.getCommentaireReferent()).isEqualTo("Préciser les objectifs");
        assertThat(response.getStatut()).isEqualTo(StatutProjet.A_CORRIGER_REFERENT);
        assertThat(response.getMotifCorrection()).isEqualTo("Préciser les objectifs");
        assertThat(ProjetResponse.fromEntity(soumis).getMotifCorrection()).isEqualTo("Préciser les objectifs");
    }

    @Test
    @DisplayName("Annulation et archivage respectent les roles et les etats terminaux")
    void annulation_et_archivage_sont_stricts() {
        Projet brouillon = projet(82L, StatutProjet.BROUILLON, groupe, membre);
        Projet approuve = projet(83L, StatutProjet.APPROUVE, groupe, membre);
        Projet annule = projet(84L, StatutProjet.ANNULE, groupe, membre);
        when(projetRepository.findById(82L)).thenReturn(Optional.of(brouillon));
        when(projetRepository.findById(83L)).thenReturn(Optional.of(approuve));
        when(projetRepository.findById(84L)).thenReturn(Optional.of(annule));
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(projetRepository.save(brouillon)).thenReturn(brouillon);
        when(projetRepository.save(annule)).thenReturn(annule);

        assertThat(projetService.annulerProjet(82L, null, membre.getEmail()).getStatut()).isEqualTo(StatutProjet.ANNULE);
        assertThatThrownBy(() -> projetService.annulerProjet(83L, "motif", membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(projetService.archiverProjet(84L, admin.getEmail()).getStatut()).isEqualTo(StatutProjet.ARCHIVE);
        assertThatThrownBy(() -> projetService.archiverProjet(83L, admin.getEmail()))
                .isInstanceOf(RuntimeException.class).hasMessageContaining("archive");
    }

    @Test
    @DisplayName("Une decision admin refusee ne sauvegarde, n'audite et ne notifie rien")
    void decision_admin_refusee_est_sans_effet() {
        Projet soumis = projet(85L, StatutProjet.SOUMIS, groupe, membre);
        when(projetRepository.findById(85L)).thenReturn(Optional.of(soumis));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> projetService.demanderCorrectionAdmin(85L, "Correction", admin.getEmail()))
                .isInstanceOf(RuntimeException.class);
        verify(projetRepository, never()).save(any());
        verifyNoInteractions(notificationService, auditLogService);
    }

    @Test
    @DisplayName("Les textes de transition sont limites a 500 caracteres au service")
    void texte_transition_est_limite_au_service() {
        Projet valide = projet(86L, StatutProjet.VALIDE_REFERENT, groupe, membre);
        when(projetRepository.findById(86L)).thenReturn(Optional.of(valide));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> projetService.demanderCorrectionAdmin(86L, "x".repeat(501), admin.getEmail()))
                .isInstanceOf(RuntimeException.class).hasMessageContaining("500");
        verify(projetRepository, never()).save(any());
        verifyNoInteractions(notificationService, auditLogService);
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
