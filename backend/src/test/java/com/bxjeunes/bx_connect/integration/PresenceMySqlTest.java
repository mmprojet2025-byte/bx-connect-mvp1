package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.dto.PresenceBulkRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.PresenceService;
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
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(PresenceService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Testcontainers
class PresenceMySqlTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("presence_test").withUsername("test").withPassword("disposable_test");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", mysql::getJdbcUrl);
        properties.add("spring.datasource.username", mysql::getUsername);
        properties.add("spring.datasource.password", mysql::getPassword);
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        properties.add("spring.flyway.enabled", () -> "true");
        properties.add("spring.flyway.baseline-on-migrate", () -> "false");
    }

    @Autowired PresenceService service;
    @Autowired ActiviteRepository activities;
    @Autowired InscriptionRepository inscriptions;
    @Autowired UserRepository users;
    @MockitoBean AuditLogService audit;
    User owner;
    Activite activity;

    @BeforeEach
    void setup() {
        owner = user(Role.REFERENT);
        activity = new Activite(); activity.setCreateur(owner); activity.setTitre("Présences");
        activity.setStatut(StatutActivite.PUBLIEE); activity.setCapaciteMax(10);
        activity.setDateDebut(LocalDateTime.now().minusHours(1)); activity.setDateFin(LocalDateTime.now().plusHours(1));
        activity = activities.saveAndFlush(activity);
    }

    @Test
    void invalidBulkRollsBackEarlierRows() {
        Inscription first = register(StatutInscription.CONFIRMEE);
        Inscription cancelled = register(StatutInscription.ANNULEE);
        assertThatThrownBy(() -> service.modifierPresencesBulk(activity.getId(), bulk(first, cancelled), owner.getEmail()))
                .hasMessageContaining("annulee");
        assertThat(inscriptions.findById(first.getId()).orElseThrow().getStatutPresence()).isEqualTo(StatutPresence.NON_RENSEIGNEE);
        assertThat(inscriptions.findById(first.getId()).orElseThrow().getDatePresence()).isNull();
    }

    @Test
    void savedSheetValidatesOnceAndRemainsReadOnlyAcrossTransactions() {
        Inscription first = register(StatutInscription.CONFIRMEE);
        Inscription cancelled = register(StatutInscription.ANNULEE);
        assertThatThrownBy(() -> service.cloturerPresences(activity.getId(), owner.getEmail())).isInstanceOf(IllegalArgumentException.class);
        service.modifierPresencesBulk(activity.getId(), bulk(first), owner.getEmail());
        service.cloturerPresences(activity.getId(), owner.getEmail());
        assertThat(inscriptions.findById(first.getId()).orElseThrow().getDateValidationPresence()).isNotNull();
        assertThat(inscriptions.findById(cancelled.getId()).orElseThrow().getDateValidationPresence()).isNull();
        assertThatThrownBy(() -> service.modifierPresencesBulk(activity.getId(), bulk(first), owner.getEmail()))
                .hasMessageContaining("déjà validée");
        assertThat(service.listerPresences(activity.getId(), owner.getEmail())).hasSize(2);
        assertThat(activities.findById(activity.getId()).orElseThrow().getStatut()).isEqualTo(StatutActivite.PUBLIEE);
    }

    private User user(Role role) {
        User user = new User(); user.setRole(role); user.setEmail(UUID.randomUUID() + "@test.invalid");
        user.setPrenom("Test"); user.setNom("Présence"); user.setMotDePasse("unused-test-password");
        return users.saveAndFlush(user);
    }

    private Inscription register(StatutInscription status) {
        Inscription inscription = new Inscription(); inscription.setActivite(activity);
        inscription.setMembre(user(Role.MEMBRE)); inscription.setStatut(status);
        return inscriptions.saveAndFlush(inscription);
    }

    private PresenceBulkRequest bulk(Inscription... rows) {
        var request = new PresenceBulkRequest();
        request.setPresences(List.of(rows).stream().map(row -> {
            var item = new PresenceBulkRequest.PresenceBulkItemRequest();
            item.setInscriptionId(row.getId()); item.setStatutPresence(StatutPresence.PRESENT); return item;
        }).toList());
        return request;
    }
}
