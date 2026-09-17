package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.SoutienRequest;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Projet;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutPaiement;
import com.bxjeunes.bx_connect.entity.StatutProjet;
import com.bxjeunes.bx_connect.entity.SoutienFinancier;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.entity.VisibiliteProjet;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.PartenaireProfilRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.NotificationService;
import com.bxjeunes.bx_connect.service.PartenaireService;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartenaireProjetSecurityTest {

    @Mock private SoutienFinancierRepository soutienRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjetRepository projetRepository;
    @Mock private ActiviteRepository activiteRepository;
    @Mock private PartenaireProfilRepository partenaireProfilRepository;
    @Mock private NotificationService notificationService;
    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private PartenaireService partenaireService;

    private User partenaire;

    @BeforeEach
    void setUp() {
        partenaire = new User();
        partenaire.setId(50L);
        partenaire.setEmail("partenaire@test.be");
        partenaire.setRole(Role.PARTENAIRE);
    }

    @Test
    @DisplayName("Liste partenaire limitee aux projets PARTENAIRES et PUBLIC ouverts")
    void liste_partenaire_limitee_aux_projets_ouverts() {
        Projet projet = projet(1L, StatutProjet.APPROUVE, VisibiliteProjet.PARTENAIRES);
        when(projetRepository.findByStatutInAndVisibiliteIn(
                List.of(StatutProjet.APPROUVE, StatutProjet.EN_COURS),
                List.of(VisibiliteProjet.PARTENAIRES, VisibiliteProjet.PUBLIC)))
                .thenReturn(List.of(projet));
        when(soutienRepository.totalSoutiensProjet(1L)).thenReturn(BigDecimal.ZERO);

        assertThat(partenaireService.projetsSoutienOuverts()).hasSize(1);
    }

    @Test
    @DisplayName("Liste admin paginee des soutiens utilise Pageable et pas findAll complet")
    void soutiens_admin_pages_utilisent_pageable() {
        SoutienFinancier soutien = soutien(100L, partenaire, StatutPaiement.EN_ATTENTE);
        when(soutienRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(soutien)));

        var response = partenaireService.tousLesSoutiensPage(null, -2, 500);

        assertThat(response.content()).hasSize(1);
        verify(soutienRepository, never()).findAll();
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(soutienRepository).findAll(captor.capture());
        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(100);
        assertThat(captor.getValue().getSort().getOrderFor("dateCreation").isDescending()).isTrue();
    }

    @Test
    @DisplayName("Liste admin paginee des soutiens conserve le filtre statut")
    void soutiens_admin_pages_filtrent_par_statut() {
        SoutienFinancier soutien = soutien(100L, partenaire, StatutPaiement.EN_ATTENTE);
        when(soutienRepository.findByStatutPaiement(
                org.mockito.ArgumentMatchers.eq(StatutPaiement.EN_ATTENTE),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(soutien)));

        var response = partenaireService.tousLesSoutiensPage(StatutPaiement.EN_ATTENTE, 0, 25);

        assertThat(response.content()).hasSize(1);
        verify(soutienRepository, never()).findAll(any(Pageable.class));
        verify(soutienRepository).findByStatutPaiement(
                org.mockito.ArgumentMatchers.eq(StatutPaiement.EN_ATTENTE),
                any(Pageable.class));
    }

    @Test
    @DisplayName("Mes soutiens pagines restent limites au partenaire connecte")
    void mes_soutiens_pages_limites_au_partenaire_connecte() {
        SoutienFinancier soutien = soutien(100L, partenaire, StatutPaiement.EN_ATTENTE);
        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(soutienRepository.findByDonateurId(
                org.mockito.ArgumentMatchers.eq(partenaire.getId()),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(
                        List.of(soutien),
                        org.springframework.data.domain.PageRequest.of(0, 100),
                        1));

        var response = partenaireService.mesSoutiensPage(partenaire.getEmail(), -4, 500);

        assertThat(response.content()).hasSize(1);
        assertThat(response.page()).isZero();
        assertThat(response.size()).isEqualTo(100);
        verify(soutienRepository).findByDonateurId(
                org.mockito.ArgumentMatchers.eq(partenaire.getId()),
                any(Pageable.class));
        verify(soutienRepository, never()).findAll();
    }

    @Test
    @DisplayName("Partenaire ne peut pas soutenir un projet GROUPE")
    void partenaire_ne_soutient_pas_projet_groupe() {
        Projet projet = projet(1L, StatutProjet.APPROUVE, VisibiliteProjet.GROUPE);
        SoutienRequest request = new SoutienRequest();
        request.setProjetId(1L);
        request.setMontant(BigDecimal.TEN);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(projetRepository.findById(1L)).thenReturn(Optional.of(projet));

        assertThatThrownBy(() -> partenaireService.soutenirProjet(request, partenaire.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Partenaire peut soutenir un projet PUBLIC approuve")
    void partenaire_soutient_projet_public_approuve() {
        Projet projet = projet(1L, StatutProjet.APPROUVE, VisibiliteProjet.PUBLIC);
        SoutienRequest request = new SoutienRequest();
        request.setProjetId(1L);
        request.setMontant(BigDecimal.TEN);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(projetRepository.findById(1L)).thenReturn(Optional.of(projet));
        when(soutienRepository.save(any())).thenAnswer(invocation -> {
            SoutienFinancier soutien = invocation.getArgument(0);
            soutien.setId(100L);
            return soutien;
        });

        var response = partenaireService.soutenirProjet(request, partenaire.getEmail());
        assertThat(response.getMontant()).isEqualByComparingTo(BigDecimal.TEN);
        assertThat(response.isDeclaratif()).isTrue();
        assertThat(response.getDatePaiement()).isNull();
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(partenaire),
                org.mockito.ArgumentMatchers.eq("SUPPORT_CREATED"),
                org.mockito.ArgumentMatchers.eq("SUPPORT"),
                org.mockito.ArgumentMatchers.eq(100L),
                org.mockito.ArgumentMatchers.eq("Projet"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("EN_ATTENTE"),
                org.mockito.ArgumentMatchers.eq("Soutien partenaire cree."),
                org.mockito.ArgumentMatchers.contains("\"projetId\":1"));
    }

    @Test
    @DisplayName("Partenaire ne peut soutenir aucune activite")
    void partenaire_ne_soutient_aucune_activite() {
        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));

        for (StatutActivite statut : List.of(
                StatutActivite.BROUILLON,
                StatutActivite.ANNULEE,
                StatutActivite.TERMINEE)) {
            Activite activite = activite(10L, statut);
            SoutienRequest request = new SoutienRequest();
            request.setActiviteId(10L);
            request.setMontant(BigDecimal.TEN);
            when(activiteRepository.findById(10L)).thenReturn(Optional.of(activite));

            assertThatThrownBy(() -> partenaireService.soutenirActivite(request, partenaire.getEmail()))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessage("Les soutiens financiers aux activités sont indisponibles dans cette version.");
        }
    }

    @Test
    @DisplayName("Partenaire ne peut pas soutenir une activite gratuite publiee")
    void partenaire_ne_soutient_pas_activite_gratuite_publiee() {
        SoutienRequest request = new SoutienRequest();
        request.setActiviteId(10L);
        request.setMontant(BigDecimal.TEN);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(activiteRepository.findById(10L))
                .thenReturn(Optional.of(activite(10L, StatutActivite.PUBLIEE)));
        assertThatThrownBy(() -> partenaireService.soutenirActivite(request, partenaire.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les soutiens financiers aux activités sont indisponibles dans cette version.");
        verify(soutienRepository, never()).save(any());
    }

    @Test
    @DisplayName("Partenaire ne peut pas contourner le refus via une activite payante publiee")
    void partenaire_ne_soutient_pas_activite_payante_publiee() {
        SoutienRequest request = new SoutienRequest();
        request.setActiviteId(10L);
        request.setMontant(BigDecimal.TEN);
        Activite activite = activite(10L, StatutActivite.PUBLIEE);
        activite.setGratuite(false);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(activiteRepository.findById(10L)).thenReturn(Optional.of(activite));

        assertThatThrownBy(() -> partenaireService.soutenirActivite(request, partenaire.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les soutiens financiers aux activités sont indisponibles dans cette version.");
        verify(soutienRepository, never()).save(any());
    }

    @Test
    @DisplayName("Un ancien soutien d'activite ne peut etre modifie ou valide comme paye")
    void ancien_soutien_activite_ne_peut_pas_progresser() {
        SoutienFinancier soutien = soutien(100L, partenaire, StatutPaiement.EN_ATTENTE);
        soutien.setProjet(null);
        soutien.setActivite(activite(10L, StatutActivite.PUBLIEE));
        SoutienRequest request = new SoutienRequest();
        request.setMontant(new BigDecimal("25.00"));

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(soutienRepository.findById(100L)).thenReturn(Optional.of(soutien));
        when(soutienRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(soutien));

        assertThatThrownBy(() -> partenaireService.modifierSoutien(100L, request, partenaire.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les soutiens financiers aux activités sont indisponibles dans cette version.");
        assertThatThrownBy(() -> partenaireService.validerSoutien(100L, "ok", null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Les soutiens financiers aux activités sont indisponibles dans cette version.");
        verify(soutienRepository, never()).save(any());
    }

    @Test
    @DisplayName("Partenaire peut modifier son soutien EN_ATTENTE")
    void partenaire_peut_modifier_son_soutien_en_attente() {
        SoutienFinancier soutien = soutien(100L, partenaire, StatutPaiement.EN_ATTENTE);
        SoutienRequest request = new SoutienRequest();
        request.setMontant(new BigDecimal("25.50"));
        request.setMessage("Message mis à jour");

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(soutienRepository.findById(100L)).thenReturn(Optional.of(soutien));
        when(soutienRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = partenaireService.modifierSoutien(100L, request, partenaire.getEmail());

        assertThat(response.getMontant()).isEqualByComparingTo("25.50");
        assertThat(response.getMessage()).isEqualTo("Message mis à jour");
        assertThat(response.getStatutPaiement()).isEqualTo(StatutPaiement.EN_ATTENTE);
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(partenaire),
                org.mockito.ArgumentMatchers.eq("SUPPORT_UPDATED"),
                org.mockito.ArgumentMatchers.eq("SUPPORT"),
                org.mockito.ArgumentMatchers.eq(100L),
                org.mockito.ArgumentMatchers.eq("Projet"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Soutien partenaire modifie."),
                org.mockito.ArgumentMatchers.contains("\"montant\":25.50"));
    }

    @Test
    @DisplayName("Partenaire ne peut pas modifier le soutien d'un autre")
    void partenaire_ne_modifie_pas_soutien_autre_partenaire() {
        User autrePartenaire = new User();
        autrePartenaire.setId(99L);
        autrePartenaire.setEmail("autre@test.be");
        autrePartenaire.setRole(Role.PARTENAIRE);
        SoutienFinancier soutien = soutien(100L, autrePartenaire, StatutPaiement.EN_ATTENTE);
        SoutienRequest request = new SoutienRequest();
        request.setMontant(BigDecimal.TEN);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(soutienRepository.findById(100L)).thenReturn(Optional.of(soutien));

        assertThatThrownBy(() -> partenaireService.modifierSoutien(100L, request, partenaire.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("propres soutiens");
        verify(soutienRepository, never()).save(any());
    }

    @Test
    @DisplayName("Partenaire ne peut pas modifier un soutien PAYE")
    void partenaire_ne_modifie_pas_soutien_paye() {
        SoutienFinancier soutien = soutien(100L, partenaire, StatutPaiement.PAYE);
        SoutienRequest request = new SoutienRequest();
        request.setMontant(BigDecimal.TEN);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(soutienRepository.findById(100L)).thenReturn(Optional.of(soutien));

        assertThatThrownBy(() -> partenaireService.modifierSoutien(100L, request, partenaire.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("ne peut plus");
        verify(soutienRepository, never()).save(any());
    }

    @Test
    @DisplayName("Partenaire peut annuler son soutien EN_ATTENTE")
    void partenaire_peut_annuler_son_soutien_en_attente() {
        SoutienFinancier soutien = soutien(100L, partenaire, StatutPaiement.EN_ATTENTE);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(soutienRepository.findById(100L)).thenReturn(Optional.of(soutien));
        when(soutienRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = partenaireService.annulerSoutien(100L, partenaire.getEmail());

        assertThat(response.getStatutPaiement()).isEqualTo(StatutPaiement.ANNULE);
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(partenaire),
                org.mockito.ArgumentMatchers.eq("SUPPORT_CANCELLED"),
                org.mockito.ArgumentMatchers.eq("SUPPORT"),
                org.mockito.ArgumentMatchers.eq(100L),
                org.mockito.ArgumentMatchers.eq("Projet"),
                org.mockito.ArgumentMatchers.eq("EN_ATTENTE"),
                org.mockito.ArgumentMatchers.eq("ANNULE"),
                org.mockito.ArgumentMatchers.eq("Soutien partenaire annule."),
                org.mockito.ArgumentMatchers.contains("\"partenaireId\":50"));
    }

    @Test
    @DisplayName("ADMIN valide et refuse un soutien avec audit")
    void admin_valide_et_refuse_soutien_avec_audit() {
        User admin = new User();
        admin.setId(1L);
        admin.setEmail("admin@test.be");
        admin.setRole(Role.ADMIN);

        SoutienFinancier soutienValide = soutien(100L, partenaire, StatutPaiement.EN_ATTENTE);
        when(soutienRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(soutienValide));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(soutienRepository.save(soutienValide)).thenReturn(soutienValide);

        var valide = partenaireService.validerSoutien(100L, "ok", admin.getEmail());

        assertThat(valide.getStatutPaiement()).isEqualTo(StatutPaiement.PAYE);
        assertThat(valide.isDeclaratif()).isTrue();
        assertThat(valide.getDatePaiement()).isNull();

        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("SUPPORT_APPROVED"),
                org.mockito.ArgumentMatchers.eq("SUPPORT"),
                org.mockito.ArgumentMatchers.eq(100L),
                org.mockito.ArgumentMatchers.eq("Projet"),
                org.mockito.ArgumentMatchers.eq("EN_ATTENTE"),
                org.mockito.ArgumentMatchers.eq("PAYE"),
                org.mockito.ArgumentMatchers.eq("Soutien partenaire valide."),
                org.mockito.ArgumentMatchers.contains("\"montant\":10"));

        SoutienFinancier soutienRefuse = soutien(101L, partenaire, StatutPaiement.EN_ATTENTE);
        when(soutienRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(soutienRefuse));
        when(soutienRepository.save(soutienRefuse)).thenReturn(soutienRefuse);

        partenaireService.refuserSoutien(101L, "non", admin.getEmail());

        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("SUPPORT_REJECTED"),
                org.mockito.ArgumentMatchers.eq("SUPPORT"),
                org.mockito.ArgumentMatchers.eq(101L),
                org.mockito.ArgumentMatchers.eq("Projet"),
                org.mockito.ArgumentMatchers.eq("EN_ATTENTE"),
                org.mockito.ArgumentMatchers.eq("REMBOURSE"),
                org.mockito.ArgumentMatchers.eq("Soutien partenaire refuse."),
                org.mockito.ArgumentMatchers.contains("\"projetId\":1"));
    }

    @Test
    @DisplayName("Une decision finale de soutien ne peut pas etre rejouee ou inversee")
    void decision_finale_ne_peut_pas_etre_rejouee() {
        SoutienFinancier accepte = soutien(102L, partenaire, StatutPaiement.PAYE);
        SoutienFinancier refuse = soutien(103L, partenaire, StatutPaiement.REMBOURSE);
        when(soutienRepository.findByIdForUpdate(102L)).thenReturn(Optional.of(accepte));
        when(soutienRepository.findByIdForUpdate(103L)).thenReturn(Optional.of(refuse));

        assertThatThrownBy(() -> partenaireService.validerSoutien(102L, "encore", null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("décision définitive");
        assertThatThrownBy(() -> partenaireService.refuserSoutien(102L, "inverse", null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("décision définitive");
        assertThatThrownBy(() -> partenaireService.refuserSoutien(103L, "encore", null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("décision définitive");
        verify(soutienRepository, never()).save(any());
        verify(notificationService, never()).creer(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Un role non partenaire ne peut pas declarer un soutien projet au service")
    void role_non_partenaire_ne_declare_pas_soutien() {
        User membre = new User();
        membre.setId(60L);
        membre.setEmail("membre@test.be");
        membre.setRole(Role.MEMBRE);
        SoutienRequest request = new SoutienRequest();
        request.setProjetId(1L);
        request.setMontant(BigDecimal.TEN);
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));

        assertThatThrownBy(() -> partenaireService.soutenirProjet(request, membre.getEmail()))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Partenaire introuvable");
        verifyNoInteractions(projetRepository);
        verify(soutienRepository, never()).save(any());
    }

    @Test
    @DisplayName("Un echec AuditLog ne bloque pas la modification d'un soutien")
    void echec_audit_ne_bloque_pas_modification_soutien() {
        SoutienFinancier soutien = soutien(100L, partenaire, StatutPaiement.EN_ATTENTE);
        SoutienRequest request = new SoutienRequest();
        request.setMontant(new BigDecimal("33.00"));
        request.setMessage("Toujours ok");

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(soutienRepository.findById(100L)).thenReturn(Optional.of(soutien));
        when(soutienRepository.save(soutien)).thenReturn(soutien);
        doThrow(new RuntimeException("Audit indisponible")).when(auditLogService).logAction(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq("SUPPORT_UPDATED"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());

        var response = partenaireService.modifierSoutien(100L, request, partenaire.getEmail());

        assertThat(response.getMontant()).isEqualByComparingTo("33.00");
        verify(soutienRepository).save(soutien);
    }

    @Test
    @DisplayName("Partenaire ne peut pas annuler un soutien PAYE")
    void partenaire_ne_peut_pas_annuler_soutien_paye() {
        SoutienFinancier soutien = soutien(100L, partenaire, StatutPaiement.PAYE);

        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(soutienRepository.findById(100L)).thenReturn(Optional.of(soutien));

        assertThatThrownBy(() -> partenaireService.annulerSoutien(100L, partenaire.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("ne peut plus");
        verify(soutienRepository, never()).save(any());
    }

    private Projet projet(Long id, StatutProjet statut, VisibiliteProjet visibilite) {
        User porteur = new User();
        porteur.setId(1L);
        porteur.setPrenom("Admin");
        porteur.setNom("Test");

        Projet projet = new Projet();
        projet.setId(id);
        projet.setTitre("Projet");
        projet.setStatut(statut);
        projet.setVisibilite(visibilite);
        projet.setPorteur(porteur);
        return projet;
    }

    private Activite activite(Long id, StatutActivite statut) {
        Activite activite = new Activite();
        activite.setId(id);
        activite.setTitre("Activité");
        activite.setStatut(statut);
        activite.setCreateur(partenaire);
        return activite;
    }

    private SoutienFinancier soutien(Long id, User donateur, StatutPaiement statut) {
        Projet projet = projet(1L, StatutProjet.APPROUVE, VisibiliteProjet.PUBLIC);
        SoutienFinancier soutien = new SoutienFinancier();
        soutien.setId(id);
        soutien.setDonateur(donateur);
        soutien.setProjet(projet);
        soutien.setMontant(BigDecimal.TEN);
        soutien.setMessage("Message initial");
        soutien.setFournisseur("DECLARATION");
        soutien.setTypeSource("DECLARATION");
        soutien.setStatutPaiement(statut);
        return soutien;
    }
}
