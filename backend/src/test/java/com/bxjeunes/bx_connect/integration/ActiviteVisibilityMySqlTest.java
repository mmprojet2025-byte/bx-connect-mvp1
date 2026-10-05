package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.service.ActiviteService;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.NotificationService;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

/** Migration and persistence checks against disposable MySQL, never the application database. */
@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({ActiviteService.class, com.bxjeunes.bx_connect.service.ActivityImageService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Testcontainers
class ActiviteVisibilityMySqlTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("visibility_test").withUsername("test").withPassword("disposable_test");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) throws SQLException {
        // Seed an actual pre-V8 row; Spring subsequently runs V8 and validates the entity mapping.
        Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())
                .target("7").load().migrate();
        try (var connection = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
             var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO utilisateurs (id, actif, date_inscription, email, langue_preference, nom, prenom, role)
                    VALUES (1, 1, NOW(), 'referent@test.invalid', 'FR', 'Test', 'Referent', 'REFERENT')
                    """);
            statement.executeUpdate("""
                    INSERT INTO activites (id, capacite_max, date_creation, date_debut, date_fin, gratuite, statut, titre, createur_id)
                    VALUES (1, 10, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY),
                            1, 'PUBLIEE', 'Activite historique', 1)
                    """);
        }
        properties.add("spring.datasource.url", mysql::getJdbcUrl);
        properties.add("spring.datasource.username", mysql::getUsername);
        properties.add("spring.datasource.password", mysql::getPassword);
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        properties.add("spring.flyway.enabled", () -> "true");
        properties.add("spring.flyway.baseline-on-migrate", () -> "false");
    }

    @Autowired ActiviteService service;
    @Autowired ActiviteRepository activities;
    @Autowired JdbcTemplate jdbc;
    @Autowired InscriptionRepository inscriptions;
    @MockitoBean NotificationService notifications;
    @MockitoBean AuditLogService audit;

    @Test
    void migrationBackfillsAndConstrainsExistingActivities() {
        assertThat(jdbc.queryForObject("SELECT visibilite FROM activites WHERE id=1", String.class)).isEqualTo("PUBLIC");
        assertThatThrownBy(() -> jdbc.update("UPDATE activites SET visibilite=NULL WHERE id=1"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE activites SET visibilite='PRIVEE' WHERE id=1"))
                .isInstanceOf(org.springframework.dao.DataAccessException.class)
                .hasMessageContaining("chk_activites_visibilite");
    }

    @Test
    void publicationPersistsStatusAndVisibilityTogether() {
        Activite draft = create("Publication", StatutActivite.BROUILLON, VisibiliteActivite.MEMBRES);
        assertThatThrownBy(() -> service.changerStatut(draft.getId(), StatutActivite.PUBLIEE, null, "referent@test.invalid"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(activities.findById(draft.getId()).orElseThrow().getStatut()).isEqualTo(StatutActivite.BROUILLON);
        var response = service.changerStatut(draft.getId(), StatutActivite.PUBLIEE, VisibiliteActivite.MEMBRES, "referent@test.invalid");
        assertThat(response.getVisibilite()).isEqualTo(VisibiliteActivite.MEMBRES);
        var saved = activities.findById(draft.getId()).orElseThrow();
        assertThat(saved.getStatut()).isEqualTo(StatutActivite.PUBLIEE);
        assertThat(saved.getVisibilite()).isEqualTo(VisibiliteActivite.MEMBRES);
    }

    @Test
    @Transactional
    void sqlPaginationAndOptionsDoNotLeakMembersOrDraftData() {
        Activite publique = create("PublicOnly", StatutActivite.PUBLIEE, VisibiliteActivite.PUBLIC);
        Activite membres = create("MembersOnly", StatutActivite.PUBLIEE, VisibiliteActivite.MEMBRES);
        Activite draft = create("DraftOnly", StatutActivite.BROUILLON, VisibiliteActivite.PUBLIC);
        var anonymous = service.listerPublieesPage(null, 0, 100);
        assertThat(anonymous.content()).extracting(row -> row.getId()).contains(publique.getId())
                .doesNotContain(membres.getId(), draft.getId());
        assertThat(anonymous.totalElements()).isEqualTo(jdbc.queryForObject(
                "SELECT COUNT(*) FROM activites WHERE statut='PUBLIEE' AND visibilite='PUBLIC'", Long.class));
        assertThat(service.listerPublieesPage("referent@test.invalid", 0, 100).content())
                .extracting(row -> row.getId()).contains(publique.getId(), membres.getId()).doesNotContain(draft.getId());
        for (String option : new String[]{"categories", "themes", "lieux"}) {
            assertThat(service.getOptionsFiltre(null).get(option)).contains("PublicOnly").doesNotContain("MembersOnly", "DraftOnly");
            assertThat(service.getOptionsFiltre("referent@test.invalid").get(option))
                    .contains("PublicOnly", "MembersOnly").doesNotContain("DraftOnly");
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {3, 2, 1})
    void capacityCannotFallBelowActiveRegistrations(int capacity) {
        Activite activity = create("Capacity", StatutActivite.PUBLIEE, VisibiliteActivite.PUBLIC);
        register(activity, StatutInscription.CONFIRMEE);
        register(activity, StatutInscription.PAYEE);
        register(activity, StatutInscription.ANNULEE);
        ActiviteRequest request = new ActiviteRequest();
        request.setDescription("Description"); request.setLieu(activity.getLieu());
        request.setTitre(activity.getTitre()); request.setDateDebut(activity.getDateDebut());
        request.setDateFin(activity.getDateFin()); request.setCapaciteMax(capacity);
        if (capacity < 2) {
            assertThatThrownBy(() -> service.modifier(activity.getId(), request, "referent@test.invalid"))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("inscriptions actives");
            assertThat(activities.findById(activity.getId()).orElseThrow().getCapaciteMax()).isEqualTo(5);
        } else {
            assertThat(service.modifier(activity.getId(), request, "referent@test.invalid").getCapaciteMax()).isEqualTo(capacity);
            assertThat(activities.findById(activity.getId()).orElseThrow().getCapaciteMax()).isEqualTo(capacity);
        }
    }

    @Test
    void cancellingPublishedActivityCancelsRegistrationsOnceAndPreservesHistory() {
        Activite activity = create("Cancellation", StatutActivite.PUBLIEE, VisibiliteActivite.MEMBRES);
        var active = register(activity, StatutInscription.CONFIRMEE);
        var paid = register(activity, StatutInscription.PAYEE);
        var pending = register(activity, StatutInscription.EN_ATTENTE_PAIEMENT);
        var cancelled = register(activity, StatutInscription.ANNULEE);
        var previousCancellation = LocalDateTime.of(2020, 1, 1, 12, 0);
        cancelled.setDateAnnulation(previousCancellation); inscriptions.saveAndFlush(cancelled);
        active.setStatutPresence(StatutPresence.PRESENT);
        active.setCommentairePresence("Historique"); inscriptions.saveAndFlush(active);
        assertThatThrownBy(() -> service.changerStatut(activity.getId(), StatutActivite.ANNULEE, null, "referent@test.invalid"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("paiement est en cours");
        assertThat(activities.findById(activity.getId()).orElseThrow().getStatut()).isEqualTo(StatutActivite.PUBLIEE);
        // Once provider confirmation resolves the reservation, cancellation can preserve all histories.
        pending.setStatut(StatutInscription.PAYEE); inscriptions.saveAndFlush(pending);
        var response = service.changerStatut(activity.getId(), StatutActivite.ANNULEE, null, "referent@test.invalid");
        assertThat(response.getStatut()).isEqualTo(StatutActivite.ANNULEE);
        assertThat(response.getVisibilite()).isEqualTo(VisibiliteActivite.MEMBRES);
        assertThat(response.getNombreInscrits()).isZero();
        assertThat(response.getPlacesRestantes()).isEqualTo(5);
        for (var registration : java.util.List.of(active, paid, pending)) {
            var saved = inscriptions.findById(registration.getId()).orElseThrow();
            assertThat(saved.getStatut()).isEqualTo(StatutInscription.ANNULEE);
            assertThat(saved.getDateAnnulation()).isNotNull();
            assertThat(saved.getDateInscription()).isEqualTo(registration.getDateInscription());
        }
        assertThat(inscriptions.findById(active.getId()).orElseThrow().getStatutPresence()).isEqualTo(StatutPresence.PRESENT);
        assertThat(inscriptions.findById(active.getId()).orElseThrow().getCommentairePresence()).isEqualTo("Historique");
        assertThat(inscriptions.findById(cancelled.getId()).orElseThrow().getDateAnnulation()).isEqualTo(previousCancellation);
        service.changerStatut(activity.getId(), StatutActivite.ANNULEE, null, "referent@test.invalid");
        verify(notifications, times(3)).creer(any(User.class), eq("Activité annulée"), contains("Cancellation"), eq("ACTIVITE_ANNULEE"), eq("/activites/" + activity.getId()));
        assertThat(inscriptions.findByActiviteId(activity.getId())).hasSize(4);
    }

    @Test
    void cancellationRollsBackWhenNotificationCannotBeSaved() {
        Activite activity = create("Rollback", StatutActivite.PUBLIEE, VisibiliteActivite.PUBLIC);
        var registration = register(activity, StatutInscription.CONFIRMEE);
        doThrow(new IllegalStateException("Notification unavailable")).when(notifications)
                .creer(any(User.class), anyString(), anyString(), eq("ACTIVITE_ANNULEE"), anyString());
        assertThatThrownBy(() -> service.changerStatut(activity.getId(), StatutActivite.ANNULEE, null, "referent@test.invalid"))
                .isInstanceOf(IllegalStateException.class);
        assertThat(activities.findById(activity.getId()).orElseThrow().getStatut()).isEqualTo(StatutActivite.PUBLIEE);
        assertThat(inscriptions.findById(registration.getId()).orElseThrow().getStatut()).isEqualTo(StatutInscription.CONFIRMEE);
    }

    private Inscription register(Activite activity, StatutInscription status) {
        String email = java.util.UUID.randomUUID() + "@test.invalid";
        jdbc.update("INSERT INTO utilisateurs (actif, date_inscription, email, langue_preference, nom, prenom, role) VALUES (1,NOW(),?,'FR','Test','Member','MEMBRE')", email);
        User member = new User(); member.setId(jdbc.queryForObject("SELECT id FROM utilisateurs WHERE email=?", Long.class, email));
        Inscription registration = new Inscription(); registration.setActivite(activity); registration.setMembre(member);
        registration.setStatut(status);
        registration.setDateInscription(LocalDateTime.of(2026, 1, 1, 12, 0));
        return inscriptions.saveAndFlush(registration);
    }

    private Activite create(String label, StatutActivite status, VisibiliteActivite visibility) {
        Activite activity = new Activite();
        User owner = new User(); owner.setId(1L);
        activity.setCreateur(owner); activity.setTitre(label); activity.setCategorie(label);
        activity.setDescription("Description"); activity.setTheme(label); activity.setLieu(label); activity.setStatut(status); activity.setVisibilite(visibility);
        activity.setCapaciteMax(5); activity.setDateDebut(LocalDateTime.now().plusDays(1));
        activity.setDateFin(LocalDateTime.now().plusDays(2));
        return activities.saveAndFlush(activity);
    }
}
