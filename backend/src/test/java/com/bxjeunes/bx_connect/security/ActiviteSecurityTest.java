package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutInscription;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.dto.InscriptionRequest;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.ProjetRepository;
import com.bxjeunes.bx_connect.repository.SoutienFinancierRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.ActiviteService;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.InscriptionService;
import com.bxjeunes.bx_connect.service.NotificationService;
import com.bxjeunes.bx_connect.service.ReferentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActiviteSecurityTest {

    @Mock private ActiviteRepository activiteRepository;
    @Mock private UserRepository userRepository;
    @Mock private InscriptionRepository inscriptionRepository;
    @Mock private ProjetRepository projetRepository;
    @Mock private SoutienFinancierRepository soutienRepository;
    @Mock private NotificationService notificationService;
    @Mock private AuditLogService auditLogService;

    @InjectMocks private ActiviteService activiteService;
    @InjectMocks private InscriptionService inscriptionService;
    @InjectMocks private ReferentService referentService;

    private User admin;
    private User referentA;
    private User referentB;
    private Activite activiteBrouillon;
    private Activite activiteReferentB;

    @BeforeEach
    void setUp() {
        admin = user(1L, "admin@test.be", Role.ADMIN);
        referentA = user(2L, "referent-a@test.be", Role.REFERENT);
        referentB = user(3L, "referent-b@test.be", Role.REFERENT);

        activiteBrouillon = activite(10L, "Brouillon", StatutActivite.BROUILLON, admin);
        activiteReferentB = activite(20L, "Activite B", StatutActivite.PUBLIEE, referentB);
    }

    @Test
    @DisplayName("Une activite non publiee est invisible publiquement")
    void activite_non_publiee_invisible_publiquement() {
        when(activiteRepository.findById(10L)).thenReturn(Optional.of(activiteBrouillon));

        assertThatThrownBy(() -> activiteService.getById(10L, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("introuvable");
    }

    @Test
    @DisplayName("Un referent ne peut pas consulter le detail d'une activite d'autrui")
    void referent_ne_consulte_pas_activite_autrui() {
        when(activiteRepository.findById(20L)).thenReturn(Optional.of(activiteReferentB));
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));

        assertThatThrownBy(() -> activiteService.getById(20L, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Un referent ne peut pas consulter les inscriptions d'une activite d'autrui")
    void referent_ne_consulte_pas_inscriptions_activite_autrui() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(activiteRepository.findById(20L)).thenReturn(Optional.of(activiteReferentB));

        assertThatThrownBy(() -> inscriptionService.inscriptionsParActivite(20L, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(inscriptionRepository, never()).findByActiviteId(20L);
    }

    @Test
    @DisplayName("Un referent ne peut pas exporter les participants d'une activite d'autrui")
    void referent_ne_exporte_pas_participants_activite_autrui() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(activiteRepository.findById(20L)).thenReturn(Optional.of(activiteReferentB));

        assertThatThrownBy(() -> referentService.exporterParticipants(20L, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(inscriptionRepository, never()).findByActiviteId(20L);
    }

    @Test
    @DisplayName("Un referent peut modifier sa propre activite")
    void referent_peut_modifier_propre_activite() {
        Activite activiteReferentA = activite(30L, "Ancien titre", StatutActivite.BROUILLON, referentA);
        ActiviteRequest request = activiteRequest("Nouveau titre");

        when(activiteRepository.findById(30L)).thenReturn(Optional.of(activiteReferentA));
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(activiteRepository.save(any(Activite.class))).thenAnswer(inv -> inv.getArgument(0));
        when(inscriptionRepository.countByActiviteIdAndStatutIn(any(), any())).thenReturn(0L);

        var response = activiteService.modifier(30L, request, referentA.getEmail());

        assertThat(response.getTitre())
                .isEqualTo("Nouveau titre");
        assertThat(response.getAdresse())
                .isEqualTo("Rue de Bruxelles 1");
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(referentA),
                org.mockito.ArgumentMatchers.eq("ACTIVITY_UPDATED"),
                org.mockito.ArgumentMatchers.eq("ACTIVITY"),
                org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("Nouveau titre"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Activite modifiee."),
                org.mockito.ArgumentMatchers.contains("\"commune\":\"Bruxelles\""));
    }

    @Test
    @DisplayName("Un referent ne peut pas modifier l'activite d'un autre referent")
    void referent_ne_modifie_pas_activite_autrui() {
        ActiviteRequest request = activiteRequest("Tentative");

        when(activiteRepository.findById(20L)).thenReturn(Optional.of(activiteReferentB));
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));

        assertThatThrownBy(() -> activiteService.modifier(20L, request, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(activiteRepository, never()).save(any(Activite.class));
    }

    @Test
    @DisplayName("ADMIN peut consulter les inscriptions d'une activite")
    void admin_peut_consulter_inscriptions_activite() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(activiteRepository.findById(20L)).thenReturn(Optional.of(activiteReferentB));
        when(inscriptionRepository.findByActiviteId(20L)).thenReturn(List.of());

        inscriptionService.inscriptionsParActivite(20L, admin.getEmail());

        verify(inscriptionRepository).findByActiviteId(20L);
    }

    @Test
    @DisplayName("Audit creation activite")
    void audit_creation_activite() {
        ActiviteRequest request = activiteRequest("Nouvelle activite");
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(activiteRepository.save(any(Activite.class))).thenAnswer(inv -> {
            Activite activite = inv.getArgument(0);
            activite.setId(40L);
            return activite;
        });
        when(inscriptionRepository.countByActiviteIdAndStatutIn(any(), any())).thenReturn(0L);

        var response = activiteService.creer(request, admin.getEmail());

        assertThat(response.getId()).isEqualTo(40L);
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("ACTIVITY_CREATED"),
                org.mockito.ArgumentMatchers.eq("ACTIVITY"),
                org.mockito.ArgumentMatchers.eq(40L),
                org.mockito.ArgumentMatchers.eq("Nouvelle activite"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("BROUILLON"),
                org.mockito.ArgumentMatchers.eq("Activite creee."),
                org.mockito.ArgumentMatchers.contains("\"commune\":\"Bruxelles\""));
    }

    @Test
    @DisplayName("Audit publication activite")
    void audit_publication_activite() {
        Activite activite = activite(30L, "Atelier", StatutActivite.BROUILLON, admin);
        when(activiteRepository.findById(30L)).thenReturn(Optional.of(activite));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(activiteRepository.save(activite)).thenReturn(activite);
        when(userRepository.findByRoleAndActifTrue(Role.MEMBRE)).thenReturn(List.of());
        when(inscriptionRepository.countByActiviteIdAndStatutIn(any(), any())).thenReturn(0L);

        var response = activiteService.changerStatut(30L, StatutActivite.PUBLIEE, admin.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutActivite.PUBLIEE);
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("ACTIVITY_PUBLISHED"),
                org.mockito.ArgumentMatchers.eq("ACTIVITY"),
                org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("Atelier"),
                org.mockito.ArgumentMatchers.eq("BROUILLON"),
                org.mockito.ArgumentMatchers.eq("PUBLIEE"),
                org.mockito.ArgumentMatchers.eq("Statut activite modifie."),
                org.mockito.ArgumentMatchers.contains("\"commune\":\"Bruxelles\""));
    }

    @Test
    @DisplayName("Audit changement statut activite")
    void audit_changement_statut_activite() {
        Activite activite = activite(30L, "Atelier", StatutActivite.PUBLIEE, admin);
        when(activiteRepository.findById(30L)).thenReturn(Optional.of(activite));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(activiteRepository.save(activite)).thenReturn(activite);
        when(inscriptionRepository.countByActiviteIdAndStatutIn(any(), any())).thenReturn(0L);

        var response = activiteService.changerStatut(30L, StatutActivite.TERMINEE, admin.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutActivite.TERMINEE);
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("ACTIVITY_STATUS_CHANGED"),
                org.mockito.ArgumentMatchers.eq("ACTIVITY"),
                org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("Atelier"),
                org.mockito.ArgumentMatchers.eq("PUBLIEE"),
                org.mockito.ArgumentMatchers.eq("TERMINEE"),
                org.mockito.ArgumentMatchers.eq("Statut activite modifie."),
                org.mockito.ArgumentMatchers.contains("\"commune\":\"Bruxelles\""));
    }

    @Test
    @DisplayName("Audit suppression activite")
    void audit_suppression_activite() {
        Activite activite = activite(30L, "Atelier", StatutActivite.BROUILLON, admin);
        when(activiteRepository.findById(30L)).thenReturn(Optional.of(activite));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        activiteService.supprimer(30L, admin.getEmail());

        verify(activiteRepository).delete(activite);
        verify(auditLogService).logAction(
                org.mockito.ArgumentMatchers.same(admin),
                org.mockito.ArgumentMatchers.eq("ACTIVITY_DELETED"),
                org.mockito.ArgumentMatchers.eq("ACTIVITY"),
                org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("Atelier"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("Activite supprimee."),
                org.mockito.ArgumentMatchers.contains("\"commune\":\"Bruxelles\""));
    }

    @Test
    @DisplayName("Audit inscription activite")
    void audit_inscription_activite() {
        User membre = user(4L, "membre@test.be", Role.MEMBRE);
        Activite activite = activite(30L, "Atelier", StatutActivite.PUBLIEE, admin);
        InscriptionRequest request = new InscriptionRequest();
        request.setActiviteId(30L);

        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(activiteRepository.findById(30L)).thenReturn(Optional.of(activite));
        when(inscriptionRepository.findByMembreIdAndActiviteId(4L, 30L)).thenReturn(Optional.empty());
        when(inscriptionRepository.countByActiviteIdAndStatutIn(any(), any())).thenReturn(0L);
        when(inscriptionRepository.save(any(Inscription.class))).thenAnswer(inv -> {
            Inscription inscription = inv.getArgument(0);
            inscription.setId(70L);
            return inscription;
        });

        var response = inscriptionService.inscrire(request, membre.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutInscription.CONFIRMEE);
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(membre),
                org.mockito.ArgumentMatchers.eq("ACTIVITY_REGISTRATION_CREATED"),
                org.mockito.ArgumentMatchers.eq("ACTIVITY"),
                org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("Atelier"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("CONFIRMEE"),
                org.mockito.ArgumentMatchers.eq("Inscription activite creee."),
                org.mockito.ArgumentMatchers.contains("\"inscriptionId\":70"));
    }

    @Test
    @DisplayName("Audit annulation inscription activite")
    void audit_annulation_inscription_activite() {
        User membre = user(4L, "membre@test.be", Role.MEMBRE);
        Activite activite = activite(30L, "Atelier", StatutActivite.PUBLIEE, admin);
        Inscription inscription = new Inscription();
        inscription.setId(70L);
        inscription.setMembre(membre);
        inscription.setActivite(activite);
        inscription.setStatut(StatutInscription.CONFIRMEE);

        when(inscriptionRepository.findById(70L)).thenReturn(Optional.of(inscription));
        when(inscriptionRepository.save(inscription)).thenReturn(inscription);

        var response = inscriptionService.annuler(70L, membre.getEmail());

        assertThat(response.getStatut()).isEqualTo(StatutInscription.ANNULEE);
        verify(auditLogService).logStatusChange(
                org.mockito.ArgumentMatchers.same(membre),
                org.mockito.ArgumentMatchers.eq("ACTIVITY_REGISTRATION_CANCELLED"),
                org.mockito.ArgumentMatchers.eq("ACTIVITY"),
                org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("Atelier"),
                org.mockito.ArgumentMatchers.eq("CONFIRMEE"),
                org.mockito.ArgumentMatchers.eq("ANNULEE"),
                org.mockito.ArgumentMatchers.eq("Inscription activite annulee."),
                org.mockito.ArgumentMatchers.contains("\"inscriptionId\":70"));
    }

    @Test
    @DisplayName("Un echec AuditLog ne bloque pas la modification d'activite")
    void echec_audit_ne_bloque_pas_modification_activite() {
        Activite activite = activite(30L, "Ancien titre", StatutActivite.BROUILLON, referentA);
        ActiviteRequest request = activiteRequest("Nouveau titre");
        when(activiteRepository.findById(30L)).thenReturn(Optional.of(activite));
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(activiteRepository.save(any(Activite.class))).thenAnswer(inv -> inv.getArgument(0));
        when(inscriptionRepository.countByActiviteIdAndStatutIn(any(), any())).thenReturn(0L);
        doThrow(new RuntimeException("Audit indisponible")).when(auditLogService).logAction(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq("ACTIVITY_UPDATED"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());

        var response = activiteService.modifier(30L, request, referentA.getEmail());

        assertThat(response.getTitre()).isEqualTo("Nouveau titre");
        verify(activiteRepository).save(any(Activite.class));
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

    private Activite activite(Long id, String titre, StatutActivite statut, User createur) {
        Activite activite = new Activite();
        activite.setId(id);
        activite.setTitre(titre);
        activite.setDescription("Description");
        activite.setDateDebut(LocalDateTime.now().plusDays(1));
        activite.setDateFin(LocalDateTime.now().plusDays(1).plusHours(2));
        activite.setLieu("Bruxelles");
        activite.setAdresse("Rue de Bruxelles 1");
        activite.setCommune("Bruxelles");
        activite.setLatitude(new BigDecimal("50.8466000"));
        activite.setLongitude(new BigDecimal("4.3528000"));
        activite.setGratuite(true);
        activite.setCapaciteMax(10);
        activite.setStatut(statut);
        activite.setCreateur(createur);
        return activite;
    }

    private ActiviteRequest activiteRequest(String titre) {
        ActiviteRequest request = new ActiviteRequest();
        request.setTitre(titre);
        request.setDescription("Description mise a jour");
        request.setDateDebut(LocalDateTime.now().plusDays(2));
        request.setDateFin(LocalDateTime.now().plusDays(2).plusHours(2));
        request.setLieu("Bruxelles");
        request.setAdresse("Rue de Bruxelles 1");
        request.setCommune("Bruxelles");
        request.setLatitude(new BigDecimal("50.8466000"));
        request.setLongitude(new BigDecimal("4.3528000"));
        request.setGratuite(true);
        request.setCapaciteMax(12);
        request.setCategorie("Atelier");
        request.setTheme("Creatif");
        return request;
    }
}
