package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.UUID;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

/** Real service transactions on disposable MySQL, including failed-write rollback. */
@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(ActiviteService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Testcontainers
class ActiviteWriteRulesMySqlTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("activity_write_test").withUsername("test").withPassword("disposable_test");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", mysql::getJdbcUrl);
        properties.add("spring.datasource.username", mysql::getUsername);
        properties.add("spring.datasource.password", mysql::getPassword);
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        properties.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired ActiviteService service;
    @Autowired ActiviteRepository activities;
    @Autowired GroupeRepository groups;
    @Autowired UserRepository users;
    @Autowired PlatformTransactionManager transactionManager;
    @MockitoBean NotificationService notifications;
    @MockitoBean AuditLogService audit;
    User admin, referent, other;
    Groupe group;

    @BeforeEach
    void setup() {
        admin = user(Role.ADMIN);
        referent = user(Role.REFERENT);
        other = user(Role.REFERENT);
        group = new Groupe();
        group.setNom("Groupe test"); group.setStatut(StatutGroupe.VALIDE);
        group.setActif(true); group.setReferent(referent);
        group = groups.saveAndFlush(group);
    }

    @Test
    void generalAndGroupAssignmentsPersistAndPublish() {
        Long general = service.creer(request(false), admin.getEmail()).getId();
        Long assigned = service.creer(request(true), admin.getEmail()).getId();
        service.changerStatut(general, StatutActivite.PUBLIEE, VisibiliteActivite.PUBLIC, admin.getEmail());
        service.changerStatut(assigned, StatutActivite.PUBLIEE, VisibiliteActivite.PRIVE_GROUPE, referent.getEmail());
        inTransaction(() -> {
            Activite a = activities.findById(general).orElseThrow();
            assertThat(a.getGroupe()).isNull();
            assertThat(a.getReferentAssigne()).isNull();
            assertThat(a.getVisibilite()).isEqualTo(VisibiliteActivite.PUBLIC);
            Activite b = activities.findById(assigned).orElseThrow();
            assertThat(b.getCreateur().getId()).isEqualTo(admin.getId());
            assertThat(b.getReferentAssigne().getId()).isEqualTo(referent.getId());
            assertThat(b.getGroupe().getId()).isEqualTo(group.getId());
            assertThat(b.getVisibilite()).isEqualTo(VisibiliteActivite.PRIVE_GROUPE);
            assertThat(b.getStatut()).isEqualTo(StatutActivite.PUBLIEE);
            assertThat(b.isGratuite()).isTrue();
            assertThat(b.getPrix()).isNull();
        });
    }

    @Test
    void changedRealReferentPreventsPublicationAndManagementWithoutTransfer() {
        Long id = service.creer(request(true), admin.getEmail()).getId();
        group.setReferent(other);
        groups.saveAndFlush(group);
        assertThatThrownBy(() -> service.changerStatut(id, StatutActivite.PUBLIEE,
                VisibiliteActivite.PUBLIC, admin.getEmail())).hasMessageContaining("référent actuel");
        assertThatThrownBy(() -> service.modifier(id, request(true), referent.getEmail()))
                .hasMessageContaining("référent actuel");
        inTransaction(() -> {
            Activite a = activities.findById(id).orElseThrow();
            assertThat(a.getStatut()).isEqualTo(StatutActivite.BROUILLON);
            assertThat(a.getReferentAssigne().getId()).isEqualTo(referent.getId());
            assertThat(a.getCreateur().getId()).isEqualTo(admin.getId());
        });
    }

    @Test
    void publishedVisibilityChangeRollsBackEntireModification() {
        Long id = service.creer(request(true), admin.getEmail()).getId();
        service.changerStatut(id, StatutActivite.PUBLIEE, VisibiliteActivite.PUBLIC, admin.getEmail());
        ActiviteRequest forged = request(true);
        forged.setTitre("Must not persist");
        forged.setVisibilite(VisibiliteActivite.PRIVE_GROUPE);
        assertThatThrownBy(() -> service.modifier(id, forged, admin.getEmail())).hasMessageContaining("figés");
        Activite saved = activities.findById(id).orElseThrow();
        assertThat(saved.getTitre()).isEqualTo("Atelier");
        assertThat(saved.getVisibilite()).isEqualTo(VisibiliteActivite.PUBLIC);
    }

    @Test
    void paidHistoricalActivityIsNotConvertedOrReassigned() {
        Activite legacy = new Activite();
        legacy.setTitre("Historique"); legacy.setCreateur(referent); legacy.setGratuite(false);
        legacy.setPrix(new BigDecimal("15.50")); legacy.setVisibilite(VisibiliteActivite.MEMBRES);
        legacy.setDateDebut(LocalDateTime.now().plusDays(1)); legacy.setDateFin(legacy.getDateDebut().plusHours(1));
        legacy.setCapaciteMax(10);
        Long id = activities.saveAndFlush(legacy).getId();
        ActiviteRequest edit = request(false);
        edit.setGratuite(false); edit.setPrix(new BigDecimal("15.50"));
        service.modifier(id, edit, referent.getEmail());
        assertThatThrownBy(() -> service.modifier(id, request(false), admin.getEmail()))
                .hasMessageContaining("gratuit ou payant");
        inTransaction(() -> {
            Activite saved = activities.findById(id).orElseThrow();
            assertThat(saved.isGratuite()).isFalse();
            assertThat(saved.getPrix()).isEqualByComparingTo("15.50");
            assertThat(saved.getVisibilite()).isEqualTo(VisibiliteActivite.MEMBRES);
            assertThat(saved.getCreateur().getId()).isEqualTo(referent.getId());
            assertThat(saved.getGroupe()).isNull();
            assertThat(saved.getReferentAssigne()).isNull();
        });
    }

    private void inTransaction(Runnable checks) {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> checks.run());
    }

    private User user(Role role) {
        User user = new User();
        user.setEmail(UUID.randomUUID() + "@test.invalid"); user.setNom("Test"); user.setPrenom("Test");
        user.setMotDePasse("unused"); user.setRole(role); user.setActif(true);
        return users.saveAndFlush(user);
    }

    private ActiviteRequest request(boolean assigned) {
        ActiviteRequest request = new ActiviteRequest();
        request.setTitre("Atelier"); request.setDescription("Description"); request.setLieu("Bruxelles");
        request.setDateDebut(LocalDateTime.now().plusDays(1)); request.setDateFin(request.getDateDebut().plusHours(1));
        request.setCapaciteMax(10);
        if (assigned) request.setGroupeId(group.getId());
        return request;
    }
}
