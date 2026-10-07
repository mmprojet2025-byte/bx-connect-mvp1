package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.dto.*;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.*;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({com.bxjeunes.bx_connect.service.ActivityImageService.class, InscriptionService.class, PresenceService.class, ActiviteService.class,
        ReferentService.class, MembreDashboardService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Testcontainers
class ActiviteParticipationMySqlTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("participation_test").withUsername("test").withPassword("disposable_test");
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", mysql::getJdbcUrl);
        p.add("spring.datasource.username", mysql::getUsername);
        p.add("spring.datasource.password", mysql::getPassword);
        p.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        p.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired InscriptionService service;
    @Autowired PresenceService presences;
    @Autowired ActiviteService activityService;
    @Autowired ReferentService referents;
    @Autowired MembreDashboardService dashboard;
    @Autowired ActiviteRepository activities;
    @Autowired InscriptionRepository registrations;
    @Autowired UserRepository users;
    @Autowired GroupeRepository groups;
    @Autowired MembreGroupeRepository memberships;
    @Autowired PlatformTransactionManager manager;
    @MockitoBean NotificationService notifications;
    @MockitoBean AuditLogService audit;
    User admin, referent, otherReferent, member, otherMember;
    Groupe group;
    Activite activity;
    TransactionTemplate transaction;

    @BeforeEach
    void setup() {
        transaction = new TransactionTemplate(manager);
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        admin = user(Role.ADMIN); referent = user(Role.REFERENT); otherReferent = user(Role.REFERENT);
        member = user(Role.MEMBRE); otherMember = user(Role.MEMBRE);
        group = new Groupe(); group.setNom("Groupe"); group.setReferent(referent); group.setStatut(StatutGroupe.VALIDE);
        group = groups.saveAndFlush(group);
        activity = new Activite(); activity.setTitre("Atelier"); activity.setDescription("Description");
        activity.setLieu("Bruxelles"); activity.setCreateur(admin);
        activity.setGroupe(group); activity.setReferentAssigne(referent);
        activity.setDateDebut(LocalDateTime.now().plusDays(1)); activity.setDateFin(activity.getDateDebut().plusHours(2));
        activity.setCapaciteMax(2); activity.setStatut(StatutActivite.PUBLIEE);
        activity = activities.saveAndFlush(activity);
    }

    @ParameterizedTest
    @ValueSource(strings = {"generale", "groupePublicExterieur", "priveAccepte"})
    void eligibleMemberCanRegisterAndReactivateTheSameRow(String scenario) {
        if (scenario.equals("generale")) changeActivity(a -> { a.setGroupe(null); a.setReferentAssigne(null); });
        if (scenario.equals("priveAccepte")) {
            changeActivity(a -> a.setVisibilite(VisibiliteActivite.PRIVE_GROUPE));
            adhere(group, StatutMembre.ACCEPTE);
        }
        Long id = register(member);
        assertThat(registrations.findById(id).orElseThrow().getStatut()).isEqualTo(StatutInscription.CONFIRMEE);
        assertThatThrownBy(() -> register(member)).hasMessageContaining("déjà inscrit");
        service.annuler(id, member.getEmail());
        assertThat(registrations.findById(id).orElseThrow().getDateAnnulation()).isNotNull();
        assertThat(register(member)).isEqualTo(id);
        assertThat(registrations.findByActiviteId(activity.getId())).hasSize(1);
        assertThat(registrations.findById(id).orElseThrow().getDateAnnulation()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"attente", "refuse", "quitte", "autreGroupe", "inactif", "nonMembre"})
    void privateRegistrationRejectsIneligibleActorWithoutCreatingHistory(String scenario) {
        changeActivity(a -> a.setVisibilite(VisibiliteActivite.PRIVE_GROUPE));
        switch (scenario) {
            case "attente" -> adhere(group, StatutMembre.EN_ATTENTE);
            case "refuse" -> adhere(group, StatutMembre.REFUSE);
            case "quitte" -> adhere(group, StatutMembre.QUITTE);
            case "autreGroupe" -> {
                Groupe other = new Groupe(); other.setNom("Autre"); other.setReferent(otherReferent);
                adhere(groups.saveAndFlush(other), StatutMembre.ACCEPTE);
            }
            case "inactif" -> tx(() -> { users.findById(member.getId()).orElseThrow().setActif(false); return null; });
            case "nonMembre" -> member = otherReferent;
        }
        assertThatThrownBy(() -> register(member)).isInstanceOf(RuntimeException.class)
                .hasMessageNotContaining("Atelier");
        assertThat(registrations.findByActiviteId(activity.getId())).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"brouillon", "terminee", "annulee", "commencee", "payante", "pleine", "validee"})
    void registrationKeepsAllBusinessGuards(String scenario) {
        switch (scenario) {
            case "brouillon" -> changeActivity(a -> a.setStatut(StatutActivite.BROUILLON));
            case "terminee" -> changeActivity(a -> a.setStatut(StatutActivite.TERMINEE));
            case "annulee" -> changeActivity(a -> a.setStatut(StatutActivite.ANNULEE));
            case "commencee" -> start();
            case "payante" -> changeActivity(a -> { a.setGratuite(false); a.setPrix(BigDecimal.TEN); });
            case "pleine" -> { changeActivity(a -> a.setCapaciteMax(1)); register(otherMember); }
            case "validee" -> {
                Long id = register(otherMember);
                markValidated(id);
            }
        }
        assertThatThrownBy(() -> register(member)).isInstanceOf(RuntimeException.class);
        assertThat(registrations.findByMembreIdAndActiviteId(member.getId(), activity.getId())).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"commencee", "terminee", "annulee", "brouillon", "validee", "autreLigneValidee", "dejaAnnulee"})
    void cancellationRejectsForbiddenStatesWithoutChangingHistory(String scenario) {
        Long id = register(member);
        switch (scenario) {
            case "commencee" -> start();
            case "terminee" -> changeActivity(a -> a.setStatut(StatutActivite.TERMINEE));
            case "annulee" -> changeActivity(a -> a.setStatut(StatutActivite.ANNULEE));
            case "brouillon" -> changeActivity(a -> a.setStatut(StatutActivite.BROUILLON));
            case "validee" -> markValidated(id);
            case "autreLigneValidee" -> markValidated(register(otherMember));
            case "dejaAnnulee" -> service.annuler(id, member.getEmail());
        }
        Inscription before = registrations.findById(id).orElseThrow();
        assertThatThrownBy(() -> service.annuler(id, member.getEmail())).isInstanceOf(RuntimeException.class);
        Inscription after = registrations.findById(id).orElseThrow();
        assertThat(after.getStatut()).isEqualTo(before.getStatut());
        assertThat(after.getDateAnnulation()).isEqualTo(before.getDateAnnulation());
        assertThat(after.getDateValidationPresence()).isEqualTo(before.getDateValidationPresence());
    }

    @ParameterizedTest
    @ValueSource(strings = {"admin", "referent"})
    void assignedManagerCanSaveRepeatedlyThenValidateWithoutCountingCancelledRows(String actor) {
        String email = actor.equals("admin") ? admin.getEmail() : referent.getEmail();
        Long id = register(member);
        Long cancelled = register(otherMember);
        service.annuler(cancelled, otherMember.getEmail());
        start();
        presences.modifierPresence(activity.getId(), id, presence(StatutPresence.PRESENT), email);
        presences.modifierPresence(activity.getId(), id, presence(StatutPresence.EXCUSE), email);
        assertThat(registrations.findById(id).orElseThrow().getDateValidationPresence()).isNull();
        assertThat(presences.cloturerPresences(activity.getId(), email)).hasSize(1);
        assertThat(registrations.findById(id).orElseThrow().getDateValidationPresence()).isNotNull();
        assertThat(registrations.findById(cancelled).orElseThrow().getDateValidationPresence()).isNull();
        assertThatThrownBy(() -> presences.modifierPresence(activity.getId(), id, presence(StatutPresence.PRESENT), email))
                .hasMessageContaining("déjà validée");
        assertThatThrownBy(() -> service.annuler(id, member.getEmail())).hasMessageContaining("indisponible");
        assertThat(activityService.getById(activity.getId(), admin.getEmail()).getNombreInscrits()).isEqualTo(1);
        assertThat(referents.dashboard(referent.getEmail()).get("totalInscriptions")).isEqualTo(1L);
        assertThat(referents.tauxRemplissage(referent.getEmail()).getFirst().get("inscrits")).isEqualTo(1L);
        assertThat(presences.listerPresences(activity.getId(), email)).hasSize(2);
    }

    @Test
    void onlyCurrentAssignmentGrantsManagementAndCreatorDoesNotTransferIt() {
        Long id = register(member);
        changeActivity(a -> a.setCreateur(otherReferent));
        assertThat(activityService.mesActivites(referent.getEmail())).extracting(ActiviteResponse::getId).contains(activity.getId());
        assertThat(activityService.mesActivites(otherReferent.getEmail())).isEmpty();
        assertThat(service.inscriptionsParActivite(activity.getId(), referent.getEmail())).hasSize(1);
        assertThatThrownBy(() -> service.inscriptionsParActivite(activity.getId(), otherReferent.getEmail()))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        start();
        assertThatThrownBy(() -> presences.modifierPresence(activity.getId(), id, presence(StatutPresence.PRESENT), otherReferent.getEmail()))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        tx(() -> { groups.findById(group.getId()).orElseThrow().setReferent(otherReferent); return null; });
        assertThat(activityService.mesActivites(referent.getEmail())).isEmpty();
        assertThat(activityService.mesActivites(otherReferent.getEmail())).isEmpty();
        assertThatThrownBy(() -> presences.listerPresences(activity.getId(), referent.getEmail()))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        assertThatThrownBy(() -> service.inscriptionsParActivite(activity.getId(), referent.getEmail()))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        tx(() -> {
            assertThat(activities.findById(activity.getId()).orElseThrow().getReferentAssigne().getId()).isEqualTo(referent.getId());
            return null;
        });
        assertThat(presences.listerPresences(activity.getId(), admin.getEmail())).hasSize(1);
    }

    @Test
    void endedActivityIsReadOnlyWithoutRequiringValidationToEnd() {
        Long id = register(member); start();
        activityService.changerStatut(activity.getId(), StatutActivite.TERMINEE, null, admin.getEmail());
        assertThat(registrations.findById(id).orElseThrow().getDateValidationPresence()).isNull();
        assertThat(presences.listerPresences(activity.getId(), referent.getEmail())).hasSize(1);
        assertThatThrownBy(() -> presences.modifierPresence(activity.getId(), id, presence(StatutPresence.PRESENT), referent.getEmail()))
                .hasMessageContaining("publiée");
        assertThatThrownBy(() -> presences.cloturerPresences(activity.getId(), admin.getEmail())).hasMessageContaining("publiée");
    }

    @Test
    void activityCancellationKeepsRowsAndBlocksFurtherOperations() {
        Long id = register(member);
        activityService.changerStatut(activity.getId(), StatutActivite.ANNULEE, null, admin.getEmail());
        assertThat(registrations.findById(id).orElseThrow().getStatut()).isEqualTo(StatutInscription.ANNULEE);
        assertThatThrownBy(() -> register(otherMember)).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> service.annuler(id, member.getEmail())).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> presences.cloturerPresences(activity.getId(), admin.getEmail())).isInstanceOf(RuntimeException.class);
        assertThat(registrations.findByActiviteId(activity.getId())).hasSize(1);
    }

    @Test
    void departedPrivateMemberKeepsHistoryAndCanOnlyCancelOwnFutureRegistrationWithoutDetails() {
        changeActivity(a -> a.setVisibilite(VisibiliteActivite.PRIVE_GROUPE));
        MembreGroupe adhesion = adhere(group, StatutMembre.ACCEPTE);
        Long id = register(member);
        tx(() -> { memberships.findById(adhesion.getId()).orElseThrow().setStatut(StatutMembre.QUITTE); return null; });
        assertThat(service.mesInscriptions(member.getEmail())).isEmpty();
        assertThatThrownBy(() -> register(member)).hasMessageContaining("introuvable");
        var result = service.annuler(id, member.getEmail());
        assertThat(result.getActiviteId()).isNull();
        assertThat(result.getActiviteTitre()).isNull();
        assertThat(result.getActiviteDateDebut()).isNull();
        assertThat(result.getActiviteLieu()).isNull();
        assertThat(registrations.existsById(id)).isTrue();
        assertThat(registrations.findById(id).orElseThrow().getStatutPresence()).isEqualTo(StatutPresence.NON_RENSEIGNEE);
    }

    @Test
    void historicalCancelledActivityWithConfirmedValidatedPresenceRemainsUntouched() {
        Long id = register(member); markValidated(id);
        changeActivity(a -> a.setStatut(StatutActivite.ANNULEE));
        Inscription before = registrations.findById(id).orElseThrow();
        assertThat(activityService.getById(activity.getId(), admin.getEmail()).getStatut()).isEqualTo(StatutActivite.ANNULEE);
        assertThat(presences.listerPresences(activity.getId(), admin.getEmail())).hasSize(1);
        assertThatThrownBy(() -> service.annuler(id, member.getEmail())).hasMessageContaining("indisponible");
        assertThatThrownBy(() -> presences.modifierPresence(activity.getId(), id, presence(StatutPresence.ABSENT), admin.getEmail()))
                .isInstanceOf(RuntimeException.class);
        Inscription after = registrations.findById(id).orElseThrow();
        assertThat(after.getStatut()).isEqualTo(StatutInscription.CONFIRMEE);
        assertThat(after.getStatutPresence()).isEqualTo(StatutPresence.PRESENT);
        assertThat(after.getDateValidationPresence()).isEqualTo(before.getDateValidationPresence());
    }

    @Test
    void leavingPrivateGroupPreservesRecordedAndValidatedPresence() {
        changeActivity(a -> a.setVisibilite(VisibiliteActivite.PRIVE_GROUPE));
        MembreGroupe adhesion = adhere(group, StatutMembre.ACCEPTE);
        Long id = register(member);
        start();
        presences.modifierPresence(activity.getId(), id, presence(StatutPresence.PRESENT), referent.getEmail());
        presences.cloturerPresences(activity.getId(), referent.getEmail());
        Inscription before = registrations.findById(id).orElseThrow();
        tx(() -> { memberships.findById(adhesion.getId()).orElseThrow().setStatut(StatutMembre.QUITTE); return null; });

        assertThat(service.mesInscriptions(member.getEmail())).isEmpty();
        assertThatThrownBy(() -> activityService.getById(activity.getId(), member.getEmail())).hasMessageContaining("introuvable");
        assertThatThrownBy(() -> service.annuler(id, member.getEmail())).hasMessage("Désinscription indisponible.");
        Inscription after = registrations.findById(id).orElseThrow();
        assertThat(after.getStatut()).isEqualTo(StatutInscription.CONFIRMEE);
        assertThat(after.getStatutPresence()).isEqualTo(StatutPresence.PRESENT);
        assertThat(after.getDatePresence()).isEqualTo(before.getDatePresence());
        assertThat(after.getDateValidationPresence()).isEqualTo(before.getDateValidationPresence());
        assertThat(presences.listerPresences(activity.getId(), admin.getEmail())).hasSize(1);
    }

    @Test
    void historicalValidationOnCancelledRowCannotReopenTheSheetThroughRegistration() {
        Long id = register(member);
        service.annuler(id, member.getEmail());
        markValidated(id);
        assertThatThrownBy(() -> register(member)).hasMessageContaining("déjà validée");
        assertThatThrownBy(() -> register(otherMember)).hasMessageContaining("déjà validée");
        start();
        assertThatThrownBy(() -> presences.cloturerPresences(activity.getId(), admin.getEmail())).hasMessageContaining("déjà validée");
        assertThat(registrations.findByActiviteId(activity.getId())).hasSize(1);
        assertThat(registrations.findById(id).orElseThrow().getStatut()).isEqualTo(StatutInscription.ANNULEE);
        assertThat(registrations.findById(id).orElseThrow().getDateValidationPresence()).isNotNull();
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void validationAndCancellationSerializeOnTheActivityLock(boolean validationFirst) throws Exception {
        Long id = register(member);
        Long otherId = register(otherMember);
        tx(() -> {
            registrations.findById(id).orElseThrow().setStatutPresence(StatutPresence.PRESENT);
            registrations.findById(otherId).orElseThrow().setStatutPresence(StatutPresence.PRESENT);
            return null;
        });
        if (validationFirst) start();
        CountDownLatch lockHeld = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch contenderEntered = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> winner = pool.submit(() -> tx(() -> {
                Activite locked = activities.findByIdForUpdate(activity.getId()).orElseThrow();
                if (validationFirst) presences.cloturerPresences(activity.getId(), admin.getEmail());
                else service.annuler(id, member.getEmail());
                // Simulate an agenda change under the same lock. Both operations become date-eligible
                // in turn without sleeps around a wall-clock boundary; sheet/history checks still win.
                locked.setDateDebut(validationFirst ? LocalDateTime.now().plusDays(1) : LocalDateTime.now().minusHours(1));
                activities.flush();
                lockHeld.countDown();
                await(release);
                return null;
            }));
            assertThat(lockHeld.await(10, TimeUnit.SECONDS)).isTrue();
            Future<Throwable> contender = pool.submit(() -> {
                contenderEntered.countDown();
                try {
                    if (validationFirst) service.annuler(id, member.getEmail());
                    else presences.cloturerPresences(activity.getId(), admin.getEmail());
                    return null;
                } catch (RuntimeException ex) { return ex; }
            });
            assertThat(contenderEntered.await(10, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> contender.get(300, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            release.countDown();
            winner.get(10, TimeUnit.SECONDS);
            Throwable outcome = contender.get(10, TimeUnit.SECONDS);
            Inscription saved = registrations.findById(id).orElseThrow();
            if (validationFirst) {
                assertThat(outcome).isInstanceOf(IllegalArgumentException.class).hasMessage("Désinscription indisponible.");
                assertThat(saved.getStatut()).isEqualTo(StatutInscription.CONFIRMEE);
                assertThat(saved.getDateValidationPresence()).isNotNull();
            } else {
                assertThat(outcome).isNull();
                assertThat(saved.getStatut()).isEqualTo(StatutInscription.ANNULEE);
                assertThat(saved.getDateValidationPresence()).isNull();
                assertThat(registrations.findById(otherId).orElseThrow().getDateValidationPresence()).isNotNull();
            }
        } finally {
            release.countDown();
            pool.shutdownNow();
            assertThat(pool.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        }
    }

    @Test
    void groupUpcomingCountIncludesAdminCreatedAssignedActivity() {
        adhere(group, StatutMembre.ACCEPTE);
        assertThat(dashboard.dashboard(member.getEmail()).getGroupe().getNombreActivitesAVenir()).isEqualTo(1);
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Latch timeout");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); throw new IllegalStateException(e);
        }
    }
    private <T> T tx(Supplier<T> action) { return transaction.execute(status -> action.get()); }
    private void changeActivity(java.util.function.Consumer<Activite> change) {
        tx(() -> { change.accept(activities.findById(activity.getId()).orElseThrow()); return null; });
    }
    private void start() { changeActivity(a -> a.setDateDebut(LocalDateTime.now().minusHours(1))); }
    private Long register(User user) {
        InscriptionRequest request = new InscriptionRequest(); request.setActiviteId(activity.getId());
        return service.inscrire(request, user.getEmail()).getId();
    }
    private void markValidated(Long id) {
        tx(() -> {
            Inscription i = registrations.findById(id).orElseThrow();
            i.setStatutPresence(StatutPresence.PRESENT); i.setDateValidationPresence(LocalDateTime.now());
            i.setPresenceValideePar(admin); return null;
        });
    }
    private PresenceRequest presence(StatutPresence status) {
        PresenceRequest r = new PresenceRequest(); r.setStatutPresence(status); return r;
    }
    private MembreGroupe adhere(Groupe groupe, StatutMembre status) {
        MembreGroupe m = new MembreGroupe(member, groupe); m.setStatut(status); return memberships.saveAndFlush(m);
    }
    private User user(Role role) {
        User u = new User(); u.setPrenom("Test"); u.setNom("Test"); u.setEmail(UUID.randomUUID() + "@test.invalid");
        u.setMotDePasse("unused"); u.setRole(role); u.setActif(true); return users.saveAndFlush(u);
    }
}
