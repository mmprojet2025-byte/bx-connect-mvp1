package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.config.GlobalExceptionHandler;
import com.bxjeunes.bx_connect.controller.ActiviteController;
import com.bxjeunes.bx_connect.dto.*;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import jakarta.persistence.EntityManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real SQL authorization/counts and revocation, rolled back after each test. */
@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({com.bxjeunes.bx_connect.service.ActivityImageService.class, ActiviteService.class, InscriptionService.class, SearchService.class,
        MembreDashboardService.class, NotificationService.class, ReferentService.class, PartenaireService.class})
@Testcontainers
class ActivitePrivacyMySqlTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("activity_privacy_test").withUsername("test").withPassword("disposable_test");
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", mysql::getJdbcUrl);
        p.add("spring.datasource.username", mysql::getUsername);
        p.add("spring.datasource.password", mysql::getPassword);
        p.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        p.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired ActiviteService service;
    @Autowired InscriptionService inscriptions;
    @Autowired SearchService search;
    @Autowired MembreDashboardService dashboard;
    @Autowired NotificationService notifications;
    @Autowired ReferentService referents;
    @Autowired PartenaireService partners;
    @Autowired UserRepository users;
    @Autowired ActiviteRepository activities;
    @Autowired GroupeRepository groups;
    @Autowired MembreGroupeRepository memberships;
    @Autowired InscriptionRepository registrations;
    @Autowired NotificationRepository notificationRepository;
    @Autowired EntityManager em;
    @MockitoBean AuditLogService audit;
    User admin, referent, member;
    Groupe group;
    Activite publicActivity, privateActivity, draft, historical;
    MembreGroupe membership;

    @BeforeEach
    void setup() {
        admin = user(Role.ADMIN);
        referent = user(Role.REFERENT);
        member = user(Role.MEMBRE);
        group = new Groupe(); group.setNom("Groupe"); group.setStatut(StatutGroupe.VALIDE);
        group.setReferent(referent); group = groups.saveAndFlush(group);
        membership = new MembreGroupe(member, group); membership.setStatut(StatutMembre.ACCEPTE);
        membership = memberships.saveAndFlush(membership);
        publicActivity = activity("PUBLIC", VisibiliteActivite.PUBLIC, StatutActivite.PUBLIEE);
        privateActivity = activity("SECRET", VisibiliteActivite.PRIVE_GROUPE, StatutActivite.PUBLIEE);
        draft = activity("BROUILLON", VisibiliteActivite.PUBLIC, StatutActivite.BROUILLON);
        historical = activity("LEGACY", VisibiliteActivite.MEMBRES, StatutActivite.PUBLIEE);
        historical.setGroupe(null); historical.setReferentAssigne(null);
        activities.saveAndFlush(historical);
    }

    @ParameterizedTest
    @ValueSource(strings = {"visiteur", "accepte", "attente", "refuse", "quitte", "autreGroupe",
            "partenaire", "superAdmin", "autreReferent", "referent", "admin", "ancienReferent", "inactif"})
    void detailCatalogSearchAndSqlCountsShareTheSamePolicy(String scenario) throws Exception {
        User actor = switch (scenario) {
            case "visiteur" -> null;
            case "partenaire" -> user(Role.PARTENAIRE);
            case "superAdmin" -> user(Role.SUPER_ADMIN);
            case "autreReferent" -> user(Role.REFERENT);
            case "referent", "ancienReferent" -> referent;
            case "admin" -> admin;
            default -> member;
        };
        switch (scenario) {
            case "attente" -> membership.setStatut(StatutMembre.EN_ATTENTE);
            case "refuse" -> membership.setStatut(StatutMembre.REFUSE);
            case "quitte" -> membership.setStatut(StatutMembre.QUITTE);
            case "autreGroupe" -> {
                Groupe autre = new Groupe(); autre.setNom("Autre"); autre.setReferent(referent);
                membership.setGroupe(groups.saveAndFlush(autre));
            }
            case "ancienReferent" -> group.setReferent(user(Role.REFERENT));
            case "inactif" -> member.setActif(false);
        }
        em.flush();
        String email = actor == null ? null : actor.getEmail();
        boolean allowed = List.of("accepte", "referent", "admin").contains(scenario);
        boolean authenticated = actor != null && actor.isActif();
        long total = 1 + (authenticated ? 1 : 0) + (allowed ? 1 : 0);
        if (allowed) {
            assertThat(service.getById(privateActivity.getId(), email).getTitre()).isEqualTo("SECRET");
        } else {
            assertThatThrownBy(() -> service.getById(privateActivity.getId(), email)).hasMessageContaining("introuvable");
        }
        assertThat(service.listerPubliees(email)).hasSize((int) total);
        var page = service.listerPublieesPage(email, 0, 1);
        assertThat(page.totalElements()).isEqualTo(total);
        assertThat(page.totalPages()).isEqualTo(total);
        assertThat(service.listerPublieesPage(email, (int) total, 1).content()).isEmpty();
        assertThat(service.rechercher("SECRET", email)).hasSize(allowed ? 1 : 0);
        ActiviteFiltreRequest filter = new ActiviteFiltreRequest(); filter.setQ("SECRET");
        assertThat(service.filtrer(filter, email)).hasSize(allowed ? 1 : 0);
        assertThat(service.getOptionsFiltre(email).get("categories").contains("SECRET")).isEqualTo(allowed);
        assertThat(service.getById(publicActivity.getId(), email).getId()).isEqualTo(publicActivity.getId());
        // Both query forms must agree, including PUBLIC rows without a group.
        assertThat(service.listerPublieesPage(email, 0, 100).content()).extracting(ActiviteResponse::getId)
                .containsExactlyInAnyOrderElementsOf(service.listerPubliees(email).stream().map(ActiviteResponse::getId).toList());

        var mvc = MockMvcBuilders.standaloneSetup(new ActiviteController(service, mock(PresenceService.class)))
                .setControllerAdvice(new GlobalExceptionHandler(new MockEnvironment())).build();
        var request = get("/api/activites/" + privateActivity.getId());
        if (actor != null) request.principal(new UsernamePasswordAuthenticationToken(email, "unused", List.of()));
        var response = mvc.perform(request).andExpect(allowed ? status().isOk() : status().isNotFound()).andReturn();
        if (!allowed) assertThat(response.getResponse().getContentAsString())
                .doesNotContain("SECRET", "secret-key", "capaciteMax", "dateDebut", "groupe", "referent");

        if (actor != null && actor.getRole() != Role.SUPER_ADMIN) {
            assertThat(search.search(email, "SECRET", List.of("ACTIVITE"), 1)).hasSize(allowed ? 1 : 0);
        }
    }

    @Test
    void draftsNeverEnterCatalogAndManagementUsesCurrentAssignment() {
        assertThat(service.listerPubliees(null)).extracting(ActiviteResponse::getId).doesNotContain(draft.getId());
        assertThatThrownBy(() -> service.getById(draft.getId(), member.getEmail())).hasMessageContaining("introuvable");
        assertThat(service.getById(draft.getId(), referent.getEmail()).getId()).isEqualTo(draft.getId());
        assertThat(service.mesActivites(referent.getEmail())).extracting(ActiviteResponse::getId).contains(draft.getId());
        group.setReferent(user(Role.REFERENT)); em.flush();
        assertThat(service.mesActivites(referent.getEmail())).isEmpty();
        assertThat(referents.mesActivites(referent.getEmail())).isEmpty();
        assertThat(referents.dashboard(referent.getEmail()).get("totalActivites")).isEqualTo(0);
        assertThatThrownBy(() -> service.getById(draft.getId(), referent.getEmail())).hasMessageContaining("introuvable");
        assertThat(service.getById(draft.getId(), admin.getEmail()).getId()).isEqualTo(draft.getId());
    }

    @Test
    void revocationHidesRegistrationDashboardNotificationAndCountersWithoutDeletingHistory() {
        InscriptionRequest request = new InscriptionRequest(); request.setActiviteId(privateActivity.getId());
        Long registrationId = inscriptions.inscrire(request, member.getEmail()).getId();
        em.flush();
        assertThat(inscriptions.mesInscriptions(member.getEmail())).hasSize(1);
        assertThat(dashboard.dashboard(member.getEmail()).getInscriptions()).hasSize(1);
        assertThat(notifications.mesNotifications(member.getEmail())).hasSize(1);
        assertThat(notifications.compterNonLues(member.getEmail())).isEqualTo(1);

        membership.setStatut(StatutMembre.QUITTE); memberships.saveAndFlush(membership);
        assertThat(inscriptions.mesInscriptions(member.getEmail())).isEmpty();
        var result = dashboard.dashboard(member.getEmail());
        assertThat(result.getInscriptions()).isEmpty();
        assertThat(result.getImplication().getActivitesRejointes()).isZero();
        assertThat(result.getNotifications()).isEmpty();
        assertThat(notifications.mesNotificationsPage(member.getEmail(), 0, 1).totalElements()).isZero();
        assertThat(notifications.compterNonLues(member.getEmail())).isZero();
        assertThat(registrations.findById(registrationId).orElseThrow().getStatut()).isEqualTo(StatutInscription.CONFIRMEE);
        assertThat(notificationRepository.findByDestinataireIdOrderByDateCreationDesc(member.getId())).hasSize(1);

        // Existing cancellation remains possible, but cannot return private activity fields.
        var cancelled = inscriptions.annuler(registrationId, member.getEmail());
        assertThat(cancelled.getActiviteId()).isNull();
        assertThat(cancelled.getActiviteTitre()).isNull();
        assertThat(cancelled.getActiviteLieu()).isNull();
        assertThat(cancelled.getActiviteDateDebut()).isNull();
    }

    @Test
    void directRegistrationCannotRevealOrRegisterPrivateActivityForOutsider() {
        membership.setStatut(StatutMembre.EN_ATTENTE); em.flush();
        InscriptionRequest request = new InscriptionRequest(); request.setActiviteId(privateActivity.getId());
        long before = registrations.count();
        assertThatThrownBy(() -> inscriptions.inscrire(request, member.getEmail())).hasMessageContaining("introuvable");
        assertThat(registrations.count()).isEqualTo(before);
        assertThat(notificationRepository.findByDestinataireIdOrderByDateCreationDesc(member.getId())).isEmpty();
    }

    @Test
    void authorizedResponseIncludesAssignmentAndPreservesUnassignedHistory() throws Exception {
        em.clear();
        ActiviteResponse response = service.getById(privateActivity.getId(), admin.getEmail());
        assertThat(response.getGroupeId()).isEqualTo(group.getId());
        assertThat(response.getGroupeNom()).isEqualTo(group.getNom());
        assertThat(response.getReferentAssigneId()).isEqualTo(referent.getId());
        assertThat(response.getReferentAssignePrenom()).isEqualTo(referent.getPrenom());
        assertThat(response.getReferentAssigneNom()).isEqualTo(referent.getNom());
        var json = new ObjectMapper().findAndRegisterModules().valueToTree(response);
        assertThat(json.get("groupeId").asLong()).isEqualTo(group.getId());
        assertThat(json.get("referentAssigneId").asLong()).isEqualTo(referent.getId());
        ActiviteResponse legacy = service.getById(historical.getId(), admin.getEmail());
        assertThat(legacy.getGroupeId()).isNull();
        assertThat(legacy.getGroupeNom()).isNull();
        assertThat(legacy.getReferentAssigneId()).isNull();
        assertThat(legacy.getReferentAssignePrenom()).isNull();
        assertThat(legacy.getReferentAssigneNom()).isNull();
        assertThat(legacy.getVisibilite()).isEqualTo(VisibiliteActivite.MEMBRES);
    }

    @Test
    void partnerCatalogAndImageDtoCannotExposePrivateData() throws Exception {
        assertThat(partners.activitesSoutienOuverts(false)).extracting(m -> m.get("id")).containsExactly(publicActivity.getId());
        assertThat(partners.activitesSoutienOuverts(true)).extracting(m -> m.get("id"))
                .containsExactlyInAnyOrder(publicActivity.getId(), historical.getId());
        var mapper = new ObjectMapper().findAndRegisterModules();
        assertThat(mapper.writeValueAsString(service.getById(privateActivity.getId(), admin.getEmail())))
                .doesNotContain("imageStorageKey", "secret-key");
        SoutienFinancier soutien = new SoutienFinancier(); soutien.setActivite(privateActivity);
        assertThat(SoutienResponse.fromEntity(soutien).getActiviteId()).isNull();
        assertThat(PaiementResponse.fromEntity(soutien).getActiviteTitre()).isNull();
    }

    @Test
    void legacyMembersNeedsAuthenticationButNotGroupMembership() {
        User partner = user(Role.PARTENAIRE);
        assertThatThrownBy(() -> service.getById(historical.getId(), null)).hasMessageContaining("introuvable");
        assertThat(service.getById(historical.getId(), partner.getEmail()).getId()).isEqualTo(historical.getId());
        assertThat(historical.getVisibilite()).isEqualTo(VisibiliteActivite.MEMBRES);
        assertThat(historical.getGroupe()).isNull();
    }

    @Test
    void publicGeneralActivityIsNotLostByReferentSqlJoins() {
        publicActivity.setGroupe(null); publicActivity.setReferentAssigne(null); em.flush();
        assertThat(service.listerPublieesPage(referent.getEmail(), 0, 20).content())
                .extracting(ActiviteResponse::getId).contains(publicActivity.getId());
    }

    @Test
    void notificationWithoutResolvableActivityIsHiddenButStored() {
        Notification n = new Notification(member, "SECRET", "SECRET", "ACTIVITE_ANNULEE");
        n.setLienAction("/dashboard"); notificationRepository.saveAndFlush(n);
        assertThat(notifications.mesNotifications(member.getEmail())).isEmpty();
        assertThat(notificationRepository.existsById(n.getId())).isTrue();
    }

    private User user(Role role) {
        User u = new User(); u.setEmail(UUID.randomUUID() + "@test.invalid"); u.setNom("Test"); u.setPrenom("Test");
        u.setRole(role); u.setActif(true); u.setMotDePasse("unused");
        return users.saveAndFlush(u);
    }

    private Activite activity(String title, VisibiliteActivite visibility, StatutActivite status) {
        Activite a = new Activite(); a.setTitre(title); a.setDescription(title); a.setLieu(title);
        a.setCategorie(title); a.setTheme(title); a.setCreateur(admin); a.setGroupe(group); a.setReferentAssigne(referent);
        a.setVisibilite(visibility); a.setStatut(status); a.setCapaciteMax(10);
        a.setDateDebut(LocalDateTime.now().plusDays(1)); a.setDateFin(a.getDateDebut().plusHours(1));
        a.setImageStorageKey("secret-key");
        return activities.saveAndFlush(a);
    }
}
