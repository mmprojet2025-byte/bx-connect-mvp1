package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.dto.InscriptionRequest;
import com.bxjeunes.bx_connect.dto.InscriptionResponse;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AuditLogService;
import com.bxjeunes.bx_connect.service.InscriptionService;
import com.bxjeunes.bx_connect.service.GroupeService;
import com.bxjeunes.bx_connect.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/** Real migrated MySQL, never the developer datasource. Fails if Docker is unavailable. */
@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({InscriptionService.class, GroupeService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Testcontainers
class InscriptionLifecycleMySqlTest {

    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("bxconnect_l1_test")
            .withUsername("l1_test")
            .withPassword("l1_disposable_only");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", mysql::getJdbcUrl);
        properties.add("spring.datasource.username", mysql::getUsername);
        properties.add("spring.datasource.password", mysql::getPassword);
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        properties.add("spring.flyway.enabled", () -> "true");
        properties.add("spring.flyway.baseline-on-migrate", () -> "false");
    }

    @Autowired InscriptionService service;
    @Autowired GroupeService groupeService;
    @Autowired UserRepository users;
    @Autowired ActiviteRepository activities;
    @Autowired InscriptionRepository registrations;
    @Autowired GroupeRepository groups;
    @Autowired MembreGroupeRepository groupMembers;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean NotificationService notifications;
    @MockitoBean AuditLogService audit;

    private TransactionTemplate transaction;
    private User member;
    private User otherMember;
    private User referent;
    private Activite activity;
    private InscriptionRequest request;

    @BeforeEach
    void fixtures() {
        transaction = new TransactionTemplate(transactionManager);
        inTransaction(() -> {
            member = createUser(Role.MEMBRE);
            otherMember = createUser(Role.MEMBRE);
            referent = createUser(Role.REFERENT);
            activity = new Activite();
            activity.setTitre("L1 activite gratuite");
            activity.setCreateur(referent);
            activity.setDateDebut(LocalDateTime.now().plusDays(1));
            activity.setDateFin(LocalDateTime.now().plusDays(1).plusHours(2));
            activity.setGratuite(true);
            activity.setCapaciteMax(1);
            activity.setStatut(StatutActivite.PUBLIEE);
            activities.saveAndFlush(activity);
            return null;
        });
        request = new InscriptionRequest();
        request.setActiviteId(activity.getId());
    }

    @Test
    void migratedSchemaAndFreeRegistrationCancellationReregistration() {
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1 AND version IN ('1','2','3','4','5')",
                Integer.class)).isEqualTo(5);
        InscriptionResponse first = register(member);
        assertThat(first.getStatut()).isEqualTo(StatutInscription.CONFIRMEE);
        assertThat(first.getDateAnnulation()).isNull();
        assertVisibleRegistrations(1);

        LocalDateTime previousDate = LocalDateTime.of(2020, 1, 1, 12, 0);
        inTransaction(() -> {
            registrations.findById(first.getId()).orElseThrow().setDateInscription(previousDate);
            return null;
        });
        InscriptionResponse cancelled = cancel(first.getId(), member);
        assertThat(cancelled.getStatut()).isEqualTo(StatutInscription.ANNULEE);
        assertThat(cancelled.getDateAnnulation()).isNotNull();
        assertVisibleRegistrations(0);

        InscriptionResponse renewed = register(member);
        assertThat(renewed.getId()).isEqualTo(first.getId());
        assertThat(renewed.getStatut()).isEqualTo(StatutInscription.CONFIRMEE);
        assertThat(renewed.getDateInscription()).isAfter(previousDate);
        assertThat(renewed.getDateAnnulation()).isNull();
        assertVisibleRegistrations(1);
        verify(notifications, times(2)).creer(any(User.class), eq("Inscription confirmée"),
                anyString(), eq("INSCRIPTION_CONFIRMEE"), eq("/activites/" + activity.getId()));
        verify(audit).logStatusChange(any(User.class), eq("ACTIVITY_REGISTRATION_REACTIVATED"),
                eq("ACTIVITY"), eq(activity.getId()), eq(activity.getTitre()),
                eq("ANNULEE"), eq("CONFIRMEE"), eq("Inscription activite reactivee."),
                contains("\"inscriptionId\":" + first.getId()));
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM inscriptions WHERE membre_id = ? AND activite_id = ?",
                Integer.class, member.getId(), activity.getId())).isEqualTo(1);
        inTransaction(() -> {
            assertThat(registrations.findById(first.getId()).orElseThrow().getStatutPresence())
                    .isEqualTo(StatutPresence.NON_RENSEIGNEE);
            return null;
        });
    }

    @Test
    void activeDuplicateIsRejected() {
        InscriptionResponse first = register(member);
        assertThatThrownBy(() -> register(member)).hasMessageContaining("déjà inscrit");
        assertPersistedStatus(first.getId(), StatutInscription.CONFIRMEE);
    }

    @Test
    void anotherMemberCannotCancelRegistration() {
        InscriptionResponse first = register(member);
        assertThatThrownBy(() -> cancel(first.getId(), otherMember)).hasMessageContaining("pas autorisé");
        assertPersistedStatus(first.getId(), StatutInscription.CONFIRMEE);
    }

    @Test
    void cancelledRegistrationCannotBeCancelledTwice() {
        InscriptionResponse first = register(member);
        cancel(first.getId(), member);
        assertThatThrownBy(() -> cancel(first.getId(), member)).hasMessageContaining("déjà annulée");
    }

    @Test
    void capacityStillAppliesToFirstRegistrationAndReregistration() {
        InscriptionResponse first = register(member);
        assertThatThrownBy(() -> register(otherMember)).hasMessageContaining("complète");
        cancel(first.getId(), member);
        register(otherMember);
        assertThatThrownBy(() -> register(member)).hasMessageContaining("complète");
        assertPersistedStatus(first.getId(), StatutInscription.ANNULEE);
    }

    @RepeatedTest(10)
    void concurrentRegistrationsNeverExceedActivityCapacity() throws Exception {
        List<ConcurrentOutcome> results = runConcurrently(
                () -> service.inscrire(request, member.getEmail()),
                () -> service.inscrire(request, otherMember.getEmail()));
        assertCapacityRace(results, "complète");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM inscriptions WHERE activite_id = ? AND statut IN ('CONFIRMEE','PAYEE')",
                Integer.class, activity.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM inscriptions WHERE activite_id = ?", Integer.class,
                activity.getId())).isEqualTo(1);
    }

    @RepeatedTest(10)
    void concurrentGroupAcceptancesNeverExceedGroupCapacity() throws Exception {
        long[] ids = inTransaction(() -> {
            Groupe group = new Groupe();
            group.setNom("Groupe capacite L3");
            group.setDescription("Test concurrence");
            group.setReferent(referent);
            group.setStatut(StatutGroupe.VALIDE);
            group.setActif(true);
            group.setCapaciteMax(1);
            groups.saveAndFlush(group);
            MembreGroupe first = groupMembers.saveAndFlush(new MembreGroupe(member, group));
            MembreGroupe second = groupMembers.saveAndFlush(new MembreGroupe(otherMember, group));
            return new long[]{first.getId(), second.getId(), group.getId()};
        });
        List<ConcurrentOutcome> results = runConcurrently(
                () -> groupeService.accepterAdhesion(ids[0], referent.getEmail()),
                () -> groupeService.accepterAdhesion(ids[1], referent.getEmail()));
        assertCapacityRace(results, "capacité maximale");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM membres_groupes WHERE groupe_id = ? AND statut = 'ACCEPTE'",
                Integer.class, ids[2])).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM membres_groupes WHERE groupe_id = ? AND statut = 'EN_ATTENTE'",
                Integer.class, ids[2])).isEqualTo(1);
    }

    @Test
    void twoAvailableActivityPlacesAcceptBothConcurrentRegistrations() throws Exception {
        inTransaction(() -> { activities.findById(activity.getId()).orElseThrow().setCapaciteMax(2); return null; });
        List<ConcurrentOutcome> results = runConcurrently(
                () -> service.inscrire(request, member.getEmail()),
                () -> service.inscrire(request, otherMember.getEmail()));
        assertThat(results).allMatch(ConcurrentOutcome::success);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM inscriptions WHERE activite_id = ? AND statut = 'CONFIRMEE'",
                Integer.class, activity.getId())).isEqualTo(2);
    }

    @Test
    void twoAvailableGroupPlacesAcceptBothAndPendingMembershipsDoNotOccupyPlaces() throws Exception {
        long[] ids = createGroupWithTwoPendingMembers(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM membres_groupes WHERE groupe_id = ? AND statut = 'ACCEPTE'",
                Integer.class, ids[2])).isZero();
        List<ConcurrentOutcome> results = runConcurrently(
                () -> groupeService.accepterAdhesion(ids[0], referent.getEmail()),
                () -> groupeService.accepterAdhesion(ids[1], referent.getEmail()));
        assertThat(results).allMatch(ConcurrentOutcome::success);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM membres_groupes WHERE groupe_id = ? AND statut = 'ACCEPTE'",
                Integer.class, ids[2])).isEqualTo(2);
    }

    @ParameterizedTest
    @EnumSource(value = StatutActivite.class, names = "PUBLIEE", mode = EnumSource.Mode.EXCLUDE)
    void unpublishedActivityStillRejectsFirstRegistrationAndReregistration(StatutActivite status) {
        InscriptionResponse first = register(member);
        cancel(first.getId(), member);
        inTransaction(() -> {
            activities.findById(activity.getId()).orElseThrow().setStatut(status);
            return null;
        });
        assertThatThrownBy(() -> register(otherMember)).hasMessageContaining("pas disponible");
        assertThatThrownBy(() -> register(member)).hasMessageContaining("pas disponible");
        assertPersistedStatus(first.getId(), StatutInscription.ANNULEE);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void reregistrationPreservesExistingPresence(boolean validated) {
        InscriptionResponse first = register(member);
        LocalDateTime recordedAt = LocalDateTime.of(2020, 1, 2, 12, 0);
        inTransaction(() -> {
            Inscription existing = registrations.findById(first.getId()).orElseThrow();
            existing.setStatutPresence(StatutPresence.PRESENT);
            existing.setDatePresence(recordedAt);
            existing.setPresenceEncodeePar(referent);
            existing.setPresenceValideePar(validated ? referent : null);
            existing.setDateValidationPresence(validated ? recordedAt.plusHours(1) : null);
            existing.setCommentairePresence("Presence deja verifiee");
            return null;
        });
        cancel(first.getId(), member);
        register(member);
        inTransaction(() -> {
            Inscription existing = registrations.findById(first.getId()).orElseThrow();
            assertThat(existing.getStatutPresence()).isEqualTo(StatutPresence.PRESENT);
            assertThat(existing.getDatePresence()).isEqualTo(recordedAt);
            assertThat(existing.getPresenceEncodeePar().getId()).isEqualTo(referent.getId());
            if (validated) {
                assertThat(existing.getPresenceValideePar().getId()).isEqualTo(referent.getId());
                assertThat(existing.getDateValidationPresence()).isEqualTo(recordedAt.plusHours(1));
            } else {
                assertThat(existing.getPresenceValideePar()).isNull();
                assertThat(existing.getDateValidationPresence()).isNull();
            }
            assertThat(existing.getCommentairePresence()).isEqualTo("Presence deja verifiee");
            return null;
        });
    }

    private User createUser(Role role) {
        return users.saveAndFlush(User.builder().prenom("Test").nom("L1")
                .email(UUID.randomUUID() + "@example.invalid").motDePasse("unused-test-password")
                .role(role).build());
    }

    private InscriptionResponse register(User user) {
        return inTransaction(() -> service.inscrire(request, user.getEmail()));
    }

    private InscriptionResponse cancel(Long id, User user) {
        return inTransaction(() -> service.annuler(id, user.getEmail()));
    }

    private void assertPersistedStatus(Long id, StatutInscription status) {
        inTransaction(() -> {
            assertThat(registrations.findById(id).orElseThrow().getStatut()).isEqualTo(status);
            return null;
        });
    }

    private void assertVisibleRegistrations(int count) {
        inTransaction(() -> {
            assertThat(service.mesInscriptions(member.getEmail())).hasSize(count);
            return null;
        });
    }

    private <T> T inTransaction(Supplier<T> operation) {
        return transaction.execute(status -> operation.get());
    }

    private long[] createGroupWithTwoPendingMembers(int capacity) {
        return inTransaction(() -> {
            Groupe group = new Groupe();
            group.setNom("Groupe capacite L3"); group.setDescription("Test concurrence");
            group.setReferent(referent); group.setStatut(StatutGroupe.VALIDE); group.setActif(true);
            group.setCapaciteMax(capacity); groups.saveAndFlush(group);
            MembreGroupe first = groupMembers.saveAndFlush(new MembreGroupe(member, group));
            MembreGroupe second = groupMembers.saveAndFlush(new MembreGroupe(otherMember, group));
            return new long[]{first.getId(), second.getId(), group.getId()};
        });
    }

    private List<ConcurrentOutcome> runConcurrently(Runnable first, Runnable second) throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        try {
            Future<ConcurrentOutcome> one = executor.submit(() -> runAfter(start, first));
            Future<ConcurrentOutcome> two = executor.submit(() -> runAfter(start, second));
            start.countDown();
            return List.of(one.get(), two.get());
        } finally {
            executor.shutdownNow();
        }
    }

    private ConcurrentOutcome runAfter(CountDownLatch start, Runnable operation) throws InterruptedException {
        start.await();
        try {
            operation.run();
            return new ConcurrentOutcome(true, null);
        } catch (RuntimeException failure) {
            return new ConcurrentOutcome(false, failure.getMessage());
        }
    }

    private void assertCapacityRace(List<ConcurrentOutcome> results, String expectedMessage) {
        assertThat(results).filteredOn(ConcurrentOutcome::success).hasSize(1);
        assertThat(results).filteredOn(result -> !result.success()).singleElement()
                .extracting(ConcurrentOutcome::message).asString().contains(expectedMessage);
    }

    private record ConcurrentOutcome(boolean success, String message) {}
}
