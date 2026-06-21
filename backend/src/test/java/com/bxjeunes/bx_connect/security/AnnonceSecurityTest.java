package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.OpportunitePartenaireRequest;
import com.bxjeunes.bx_connect.entity.Annonce;
import com.bxjeunes.bx_connect.entity.CategorieOpportunite;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutModeration;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.AnnonceRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AnnonceService;
import com.bxjeunes.bx_connect.service.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnnonceSecurityTest {

    @Mock private AnnonceRepository annonceRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;
    @Mock private AuditLogService auditLogService;

    @InjectMocks private AnnonceService annonceService;

    private User admin;
    private User referentA;
    private User referentB;
    private User partenaire;
    private Groupe groupeA;

    @BeforeEach
    void setUp() {
        admin = user(1L, "admin@test.be", Role.ADMIN);
        referentA = user(2L, "referent-a@test.be", Role.REFERENT);
        referentB = user(3L, "referent-b@test.be", Role.REFERENT);
        partenaire = user(4L, "partenaire@test.be", Role.PARTENAIRE);

        groupeA = new Groupe();
        groupeA.setId(10L);
        groupeA.setNom("Groupe A");
        groupeA.setReferent(referentA);
    }

    @Test
    @DisplayName("Un referent ne cree pas d'annonce globale")
    void referent_ne_cree_pas_annonce_globale() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));

        assertThatThrownBy(() ->
                annonceService.creerAnnonce(requeteAnnonce(null), referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        verify(annonceRepository, never()).save(any(Annonce.class));
    }

    @Test
    @DisplayName("Un referent ne publie pas dans le groupe d'un autre referent")
    void referent_ne_publie_pas_autre_groupe() {
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeA));

        assertThatThrownBy(() ->
                annonceService.creerAnnonce(requeteAnnonce(10L), referentB.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        verify(annonceRepository, never()).save(any(Annonce.class));
    }

    @Test
    @DisplayName("Un referent publie une annonce de son groupe")
    void referent_publie_dans_propre_groupe() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeA));
        when(annonceRepository.save(any(Annonce.class))).thenAnswer(inv -> {
            Annonce annonce = inv.getArgument(0);
            annonce.setId(31L);
            return annonce;
        });

        Map<String, Object> resultat =
                annonceService.creerAnnonce(requeteAnnonce(10L), referentA.getEmail());

        assertThat(resultat.get("type")).isEqualTo("GROUPE");
        assertThat(resultat.get("groupeId")).isEqualTo(10L);
        assertThat(resultat.get("epinglee")).isEqualTo(false);
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(referentA),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT_CREATED"),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT"),
                org.mockito.ArgumentMatchers.eq(31L),
                org.mockito.ArgumentMatchers.eq("Information"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Annonce creee."),
                org.mockito.ArgumentMatchers.contains("\"groupeId\":10"));
    }

    @Test
    @DisplayName("Un referent ne supprime pas l'annonce d'un autre auteur")
    void referent_ne_supprime_pas_annonce_autre_auteur() {
        Annonce annonce = annonce(referentA, groupeA);
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(annonceRepository.findById(30L)).thenReturn(Optional.of(annonce));

        assertThatThrownBy(() -> annonceService.supprimer(30L, referentB.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        verify(annonceRepository, never()).delete(any(Annonce.class));
    }

    @Test
    @DisplayName("Un referent supprime sa propre annonce de groupe")
    void referent_supprime_propre_annonce_groupe() {
        Annonce annonce = annonce(referentA, groupeA);
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(annonceRepository.findById(30L)).thenReturn(Optional.of(annonce));

        annonceService.supprimer(30L, referentA.getEmail());

        verify(annonceRepository).delete(annonce);
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(referentA),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT_DELETED"),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT"),
                org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("Annonce"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Annonce supprimee."),
                org.mockito.ArgumentMatchers.contains("\"type\":\"GROUPE\""));
    }

    @Test
    @DisplayName("Seul ADMIN peut creer une annonce globale")
    void admin_peut_creer_annonce_globale() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(annonceRepository.save(any(Annonce.class))).thenAnswer(inv -> {
            Annonce annonce = inv.getArgument(0);
            annonce.setId(32L);
            return annonce;
        });

        Map<String, Object> resultat =
                annonceService.creerAnnonce(requeteAnnonce(null), admin.getEmail());

        assertThat(resultat.get("type")).isEqualTo("GLOBALE");
        assertThat(resultat).doesNotContainKey("groupeId");
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT_CREATED"),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT"),
                org.mockito.ArgumentMatchers.eq(32L),
                org.mockito.ArgumentMatchers.eq("Information"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Annonce creee."),
                org.mockito.ArgumentMatchers.contains("\"type\":\"GLOBALE\""));
    }

    @Test
    @DisplayName("Un partenaire cree une opportunite en attente")
    void partenaire_cree_opportunite_en_attente() {
        when(userRepository.findByEmail(partenaire.getEmail())).thenReturn(Optional.of(partenaire));
        when(annonceRepository.save(any(Annonce.class))).thenAnswer(inv -> {
            Annonce annonce = inv.getArgument(0);
            annonce.setId(51L);
            return annonce;
        });

        var response = annonceService.creerOpportunitePartenaire(requeteOpportunite(), partenaire.getEmail());

        assertThat(response.getCategorieOpportunite()).isEqualTo(CategorieOpportunite.EMPLOI);
        assertThat(response.getStatutModeration()).isEqualTo(StatutModeration.EN_ATTENTE);
        assertThat(response.getType()).isEqualTo("GLOBALE");
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(partenaire),
                org.mockito.ArgumentMatchers.eq("OPPORTUNITY_CREATED"),
                org.mockito.ArgumentMatchers.eq("OPPORTUNITY"),
                org.mockito.ArgumentMatchers.eq(51L),
                org.mockito.ArgumentMatchers.eq("Offre d'emploi"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("EN_ATTENTE"),
                org.mockito.ArgumentMatchers.eq("Opportunite partenaire creee."),
                org.mockito.ArgumentMatchers.contains("\"categorieOpportunite\":\"EMPLOI\""));
    }

    @Test
    @DisplayName("Le public ne voit pas une opportunite en attente")
    void public_ne_voit_pas_opportunite_en_attente() {
        Annonce opportunite = opportunite(partenaire, StatutModeration.EN_ATTENTE);
        when(annonceRepository.findByTypeOrderByEpingleeDescDateCreationDesc("GLOBALE"))
                .thenReturn(List.of(opportunite));

        assertThat(annonceService.annoncesGlobales()).isEmpty();
    }

    @Test
    @DisplayName("ADMIN voit les opportunites en attente")
    void admin_voit_opportunites_en_attente() {
        Annonce opportunite = opportunite(partenaire, StatutModeration.EN_ATTENTE);
        when(annonceRepository.findByCategorieOpportuniteIsNotNullOrderByDateCreationDesc())
                .thenReturn(List.of(opportunite));

        var opportunites = annonceService.opportunitesAdmin();

        assertThat(opportunites).hasSize(1);
        assertThat(opportunites.get(0).getStatutModeration()).isEqualTo(StatutModeration.EN_ATTENTE);
    }

    @Test
    @DisplayName("ADMIN publie une opportunite")
    void admin_publie_opportunite() {
        Annonce opportunite = opportunite(partenaire, StatutModeration.EN_ATTENTE);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(annonceRepository.findById(50L)).thenReturn(Optional.of(opportunite));
        when(annonceRepository.save(any(Annonce.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = annonceService.publierOpportunite(50L, admin.getEmail());

        assertThat(response.getStatutModeration()).isEqualTo(StatutModeration.PUBLIEE);
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("OPPORTUNITY_PUBLISHED"),
                org.mockito.ArgumentMatchers.eq("OPPORTUNITY"),
                org.mockito.ArgumentMatchers.eq(50L),
                org.mockito.ArgumentMatchers.eq("Opportunité"),
                org.mockito.ArgumentMatchers.eq("EN_ATTENTE"),
                org.mockito.ArgumentMatchers.eq("PUBLIEE"),
                org.mockito.ArgumentMatchers.eq("Opportunite partenaire publiee."),
                org.mockito.ArgumentMatchers.contains("\"categorieOpportunite\":\"EMPLOI\""));
    }

    @Test
    @DisplayName("Le public voit une opportunite publiee")
    void public_voit_opportunite_publiee() {
        Annonce opportunite = opportunite(partenaire, StatutModeration.PUBLIEE);
        when(annonceRepository.findByTypeOrderByEpingleeDescDateCreationDesc("GLOBALE"))
                .thenReturn(List.of(opportunite));

        assertThat(annonceService.annoncesGlobales()).hasSize(1);
    }

    @Test
    @DisplayName("ADMIN refuse une opportunite")
    void admin_refuse_opportunite() {
        Annonce opportunite = opportunite(partenaire, StatutModeration.EN_ATTENTE);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(annonceRepository.findById(50L)).thenReturn(Optional.of(opportunite));
        when(annonceRepository.save(any(Annonce.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = annonceService.refuserOpportunite(50L, admin.getEmail());

        assertThat(response.getStatutModeration()).isEqualTo(StatutModeration.REFUSEE);
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("OPPORTUNITY_REJECTED"),
                org.mockito.ArgumentMatchers.eq("OPPORTUNITY"),
                org.mockito.ArgumentMatchers.eq(50L),
                org.mockito.ArgumentMatchers.eq("Opportunité"),
                org.mockito.ArgumentMatchers.eq("EN_ATTENTE"),
                org.mockito.ArgumentMatchers.eq("REFUSEE"),
                org.mockito.ArgumentMatchers.eq("Opportunite partenaire refusee."),
                org.mockito.ArgumentMatchers.contains("\"categorieOpportunite\":\"EMPLOI\""));
    }

    @Test
    @DisplayName("ADMIN epingle puis desepingle une annonce")
    void admin_epingle_puis_desepingle_annonce() {
        Annonce annonce = annonce(admin, null);
        annonce.setType("GLOBALE");
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(annonceRepository.findById(30L)).thenReturn(Optional.of(annonce));
        when(annonceRepository.save(any(Annonce.class))).thenAnswer(inv -> inv.getArgument(0));

        var epinglee = annonceService.toggleEpingler(30L, admin.getEmail());
        var desepinglee = annonceService.toggleEpingler(30L, admin.getEmail());

        assertThat(epinglee.get("epinglee")).isEqualTo(true);
        assertThat(desepinglee.get("epinglee")).isEqualTo(false);
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT_PINNED"),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT"),
                org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("Annonce"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Annonce epinglee."),
                org.mockito.ArgumentMatchers.contains("\"type\":\"GLOBALE\""));
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT_UNPINNED"),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT"),
                org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("Annonce"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Annonce desepinglee."),
                org.mockito.ArgumentMatchers.contains("\"type\":\"GLOBALE\""));
    }

    @Test
    @DisplayName("Un echec AuditLog ne bloque pas la creation d'annonce")
    void echec_audit_ne_bloque_pas_creation_annonce() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(annonceRepository.save(any(Annonce.class))).thenAnswer(inv -> {
            Annonce annonce = inv.getArgument(0);
            annonce.setId(33L);
            return annonce;
        });
        doThrow(new RuntimeException("Audit indisponible")).when(auditLogService).logAction(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq("ANNOUNCEMENT_CREATED"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());

        Map<String, Object> resultat = annonceService.creerAnnonce(requeteAnnonce(null), admin.getEmail());

        assertThat(resultat.get("id")).isEqualTo(33L);
        verify(annonceRepository).save(any(Annonce.class));
    }

    private Map<String, Object> requeteAnnonce(Long groupeId) {
        Map<String, Object> request = new HashMap<>();
        request.put("titre", "Information");
        request.put("contenu", "Contenu");
        request.put("type", groupeId == null ? "GLOBALE" : "GROUPE");
        if (groupeId != null) {
            request.put("groupeId", groupeId);
        }
        return request;
    }

    private Annonce annonce(User auteur, Groupe groupe) {
        Annonce annonce = new Annonce();
        annonce.setId(30L);
        annonce.setTitre("Annonce");
        annonce.setContenu("Contenu");
        annonce.setType("GROUPE");
        annonce.setAuteur(auteur);
        annonce.setGroupe(groupe);
        return annonce;
    }

    private OpportunitePartenaireRequest requeteOpportunite() {
        OpportunitePartenaireRequest request = new OpportunitePartenaireRequest();
        request.setTitre("Offre d'emploi");
        request.setContenu("Une opportunité pour les membres.");
        request.setCategorieOpportunite(CategorieOpportunite.EMPLOI);
        request.setDescriptionCourte("Offre courte");
        request.setLienExterne("https://partner.test/jobs");
        return request;
    }

    private Annonce opportunite(User auteur, StatutModeration statut) {
        Annonce annonce = new Annonce();
        annonce.setId(50L);
        annonce.setTitre("Opportunité");
        annonce.setContenu("Contenu");
        annonce.setType("GLOBALE");
        annonce.setAuteur(auteur);
        annonce.setCategorieOpportunite(CategorieOpportunite.EMPLOI);
        annonce.setStatutModeration(statut);
        return annonce;
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPrenom("Test");
        user.setNom("User");
        user.setRole(role);
        return user;
    }
}
