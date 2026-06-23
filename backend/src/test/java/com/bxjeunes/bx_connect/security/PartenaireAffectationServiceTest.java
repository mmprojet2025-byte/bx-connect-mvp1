package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.PartenaireAffectationRequest;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.PartenaireGroupe;
import com.bxjeunes.bx_connect.entity.PartenaireProfil;
import com.bxjeunes.bx_connect.entity.PartenaireReferent;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutAffectationPartenaire;
import com.bxjeunes.bx_connect.entity.TypeLienPartenaire;
import com.bxjeunes.bx_connect.entity.TypePartenaire;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.PartenaireGroupeRepository;
import com.bxjeunes.bx_connect.repository.PartenaireProfilRepository;
import com.bxjeunes.bx_connect.repository.PartenaireReferentRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.PartenaireAffectationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartenaireAffectationServiceTest {

    @Mock private PartenaireReferentRepository partenaireReferentRepository;
    @Mock private PartenaireGroupeRepository partenaireGroupeRepository;
    @Mock private PartenaireProfilRepository partenaireProfilRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private SoutienFinancierRepository soutienFinancierRepository;
    @Mock private AuditLogService auditLogService;

    private PartenaireAffectationService service;
    private User admin;
    private User referent;
    private User autreReferent;
    private User partenaireUser;
    private User membre;
    private PartenaireProfil profil;
    private Groupe groupe;
    private Groupe autreGroupe;

    @BeforeEach
    void setUp() {
        service = new PartenaireAffectationService(
                partenaireReferentRepository,
                partenaireGroupeRepository,
                partenaireProfilRepository,
                userRepository,
                groupeRepository,
                soutienFinancierRepository,
                auditLogService);

        admin = user(1L, "admin@test.be", Role.ADMIN);
        referent = user(2L, "referent@test.be", Role.REFERENT);
        autreReferent = user(3L, "autre-referent@test.be", Role.REFERENT);
        partenaireUser = user(4L, "partenaire@test.be", Role.PARTENAIRE);
        membre = user(5L, "membre@test.be", Role.MEMBRE);
        profil = profil(10L, partenaireUser, "Partenaire Local");
        groupe = groupe(20L, "Groupe Jeunes", referent);
        autreGroupe = groupe(21L, "Autre Groupe", autreReferent);
    }

    @Test
    @DisplayName("ADMIN affecte un partenaire a un referent")
    void admin_affecte_partenaire_a_referent() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(partenaireProfilRepository.findById(profil.getId())).thenReturn(Optional.of(profil));
        when(userRepository.findById(referent.getId())).thenReturn(Optional.of(referent));
        when(partenaireReferentRepository.existsByPartenaireProfilAndReferentAndStatut(
                profil, referent, StatutAffectationPartenaire.ACTIF)).thenReturn(false);
        when(partenaireReferentRepository.save(any())).thenAnswer(invocation -> {
            PartenaireReferent affectation = invocation.getArgument(0);
            affectation.setId(100L);
            return affectation;
        });

        var response = service.affecterPartenaireAReferent(profil.getId(), referent.getId(), request(), admin.getEmail());

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getPartenaireProfilId()).isEqualTo(profil.getId());
        assertThat(response.getReferentId()).isEqualTo(referent.getId());
        verify(auditLogService).logStatusChange(
                same(admin),
                eq("PARTNER_REFERENT_ASSIGNED"),
                eq("PARTNER_REFERENT_ASSIGNMENT"),
                eq(100L),
                eq("Partenaire Local"),
                isNull(),
                eq("ACTIF"),
                eq("Partenaire affecte a un referent."),
                contains("\"referentId\":2"));
    }

    @Test
    @DisplayName("Doublon actif partenaire-referent interdit")
    void doublon_actif_partenaire_referent_interdit() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(partenaireProfilRepository.findById(profil.getId())).thenReturn(Optional.of(profil));
        when(userRepository.findById(referent.getId())).thenReturn(Optional.of(referent));
        when(partenaireReferentRepository.existsByPartenaireProfilAndReferentAndStatut(
                profil, referent, StatutAffectationPartenaire.ACTIF)).thenReturn(true);

        assertThatThrownBy(() -> service.affecterPartenaireAReferent(profil.getId(), referent.getId(), null, admin.getEmail()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("affectation active");
        verify(partenaireReferentRepository, never()).save(any());
    }

    @Test
    @DisplayName("ADMIN affecte un partenaire a un groupe")
    void admin_affecte_partenaire_a_groupe() {
        PartenaireAffectationRequest request = request();
        request.setTypeLien(TypeLienPartenaire.MENTORAT);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(partenaireProfilRepository.findById(profil.getId())).thenReturn(Optional.of(profil));
        when(groupeRepository.findById(groupe.getId())).thenReturn(Optional.of(groupe));
        when(partenaireGroupeRepository.existsByPartenaireProfilAndGroupeAndStatut(
                profil, groupe, StatutAffectationPartenaire.ACTIF)).thenReturn(false);
        when(partenaireGroupeRepository.save(any())).thenAnswer(invocation -> {
            PartenaireGroupe affectation = invocation.getArgument(0);
            affectation.setId(101L);
            return affectation;
        });

        var response = service.affecterPartenaireAGroupe(profil.getId(), groupe.getId(), request, admin.getEmail());

        assertThat(response.getId()).isEqualTo(101L);
        assertThat(response.getGroupeId()).isEqualTo(groupe.getId());
        assertThat(response.getTypeLien()).isEqualTo(TypeLienPartenaire.MENTORAT);
        verify(auditLogService).logStatusChange(
                same(admin),
                eq("PARTNER_GROUP_ASSIGNED"),
                eq("PARTNER_GROUP_ASSIGNMENT"),
                eq(101L),
                eq("Partenaire Local"),
                isNull(),
                eq("ACTIF"),
                eq("Partenaire affecte a un groupe."),
                contains("\"groupeId\":20"));
    }

    @Test
    @DisplayName("Desactivation conserve l'historique")
    void desactivation_conserve_historique() {
        PartenaireReferent affectation = new PartenaireReferent();
        affectation.setId(100L);
        affectation.setPartenaireProfil(profil);
        affectation.setReferent(referent);
        affectation.setStatut(StatutAffectationPartenaire.ACTIF);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(partenaireReferentRepository.findById(100L)).thenReturn(Optional.of(affectation));
        when(partenaireReferentRepository.save(affectation)).thenReturn(affectation);

        var response = service.desactiverAffectationReferent(100L, admin.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutAffectationPartenaire.INACTIF);
        assertThat(affectation.getDateFin()).isNotNull();
        verify(partenaireReferentRepository).save(affectation);
    }

    @Test
    @DisplayName("REFERENT voit seulement ses partenaires directs ou lies a ses groupes")
    void referent_voit_son_perimetre() {
        PartenaireReferent lienDirect = lienReferent(100L, profil, referent);
        PartenaireGroupe lienGroupe = lienGroupe(101L, profil, groupe);
        PartenaireProfil autreProfil = profil(11L, user(6L, "autre-partenaire@test.be", Role.PARTENAIRE), "Autre Partenaire");
        PartenaireGroupe lienHorsPerimetre = lienGroupe(102L, autreProfil, autreGroupe);
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(partenaireReferentRepository.findActiveByReferentId(referent.getId())).thenReturn(List.of(lienDirect));
        when(partenaireGroupeRepository.findActiveByReferentId(referent.getId())).thenReturn(List.of(lienGroupe));

        var partenaires = service.listerPartenairesReferent(referent.getEmail());

        assertThat(partenaires).hasSize(1);
        assertThat(partenaires.get(0).getPartenaireProfilId()).isEqualTo(profil.getId());
        assertThat(partenaires.get(0).isLienDirectReferent()).isTrue();
        assertThat(partenaires.get(0).getGroupesLies()).hasSize(1);
        assertThat(partenaires)
                .extracting("partenaireProfilId")
                .doesNotContain(lienHorsPerimetre.getPartenaireProfil().getId());
    }

    @Test
    @DisplayName("REFERENT interdit hors perimetre")
    void referent_interdit_hors_perimetre() {
        when(userRepository.findByEmail(referent.getEmail())).thenReturn(Optional.of(referent));
        when(partenaireReferentRepository.findActiveByReferentId(referent.getId())).thenReturn(List.of());
        when(partenaireGroupeRepository.findActiveByReferentId(referent.getId())).thenReturn(List.of());

        assertThatThrownBy(() -> service.detailPartenaireReferent(profil.getId(), referent.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("hors perimetre");
    }

    @Test
    @DisplayName("PARTENAIRE voit ses referents et groupes")
    void partenaire_voit_ses_relations() {
        PartenaireReferent lienReferent = lienReferent(100L, profil, referent);
        PartenaireGroupe lienGroupe = lienGroupe(101L, profil, groupe);
        when(userRepository.findByEmail(partenaireUser.getEmail())).thenReturn(Optional.of(partenaireUser));
        when(partenaireReferentRepository.findActiveByPartenaireUserId(partenaireUser.getId())).thenReturn(List.of(lienReferent));
        when(partenaireGroupeRepository.findActiveByPartenaireUserId(partenaireUser.getId())).thenReturn(List.of(lienGroupe));

        assertThat(service.listerReferentsPartenaire(partenaireUser.getEmail())).hasSize(1);
        assertThat(service.listerGroupesPartenaire(partenaireUser.getEmail())).hasSize(1);
    }

    @Test
    @DisplayName("MEMBRE interdit sur les consultations partenaire")
    void membre_interdit_sur_consultation_partenaire() {
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));

        assertThatThrownBy(() -> service.listerReferentsPartenaire(membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("partenaires");
    }

    @Test
    @DisplayName("Impact partenaire reutilise les soutiens existants")
    void impact_partenaire_reutilise_soutiens_existants() {
        when(userRepository.findByEmail(partenaireUser.getEmail())).thenReturn(Optional.of(partenaireUser));
        when(partenaireReferentRepository.findActiveByPartenaireUserId(partenaireUser.getId())).thenReturn(List.of());
        when(partenaireGroupeRepository.findActiveByPartenaireUserId(partenaireUser.getId())).thenReturn(List.of());
        when(soutienFinancierRepository.countByDonateurId(partenaireUser.getId())).thenReturn(2L);
        when(soutienFinancierRepository.totalMontantDonateur(partenaireUser.getId())).thenReturn(new BigDecimal("150.00"));
        when(soutienFinancierRepository.countProjetsSoutenusParDonateur(partenaireUser.getId())).thenReturn(1L);
        when(soutienFinancierRepository.countActivitesSoutenuesParDonateur(partenaireUser.getId())).thenReturn(1L);

        var impact = service.impactLocalPartenaire(partenaireUser.getEmail());

        assertThat(impact.get("totalSoutiens")).isEqualTo(2L);
        assertThat(impact.get("totalMontant")).isEqualTo(new BigDecimal("150.00"));
    }

    private PartenaireAffectationRequest request() {
        PartenaireAffectationRequest request = new PartenaireAffectationRequest();
        request.setCommentaire("Suivi local");
        return request;
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPrenom("Prenom" + id);
        user.setNom("Nom" + id);
        user.setRole(role);
        user.setActif(true);
        return user;
    }

    private PartenaireProfil profil(Long id, User utilisateur, String nomOrganisation) {
        PartenaireProfil profil = new PartenaireProfil();
        profil.setId(id);
        profil.setUtilisateur(utilisateur);
        profil.setNomOrganisation(nomOrganisation);
        profil.setTypePartenaire(TypePartenaire.ENTREPRISE);
        return profil;
    }

    private Groupe groupe(Long id, String nom, User referent) {
        Groupe groupe = new Groupe();
        groupe.setId(id);
        groupe.setNom(nom);
        groupe.setReferent(referent);
        return groupe;
    }

    private PartenaireReferent lienReferent(Long id, PartenaireProfil profil, User referent) {
        PartenaireReferent lien = new PartenaireReferent();
        lien.setId(id);
        lien.setPartenaireProfil(profil);
        lien.setReferent(referent);
        lien.setStatut(StatutAffectationPartenaire.ACTIF);
        return lien;
    }

    private PartenaireGroupe lienGroupe(Long id, PartenaireProfil profil, Groupe groupe) {
        PartenaireGroupe lien = new PartenaireGroupe();
        lien.setId(id);
        lien.setPartenaireProfil(profil);
        lien.setGroupe(groupe);
        lien.setTypeLien(TypeLienPartenaire.SOUTIEN);
        lien.setStatut(StatutAffectationPartenaire.ACTIF);
        return lien;
    }
}
