package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.ActivityPaymentService;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.*;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(ActivityPaymentService.class)
@Testcontainers
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ActivityStripeRecoveryMySqlTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("activity_recovery_test").withUsername("test").withPassword("disposable_test");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", mysql::getJdbcUrl);
        p.add("spring.datasource.username", mysql::getUsername);
        p.add("spring.datasource.password", mysql::getPassword);
        p.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        p.add("spring.flyway.enabled", () -> "true");
    }
    @Autowired ActivityPaymentService service;
    @Autowired UserRepository users;
    @Autowired ActiviteRepository activities;
    @Autowired SoutienFinancierRepository payments;
    @Autowired InscriptionRepository registrations;

    record Attempt(User member, SoutienFinancier payment, Session session) {}
    Attempt attempt() {
        var member = new User(); member.setEmail(UUID.randomUUID() + "@test.invalid");
        member.setPrenom("Test"); member.setNom("Membre"); member.setRole(Role.MEMBRE);
        member.setActif(true); member.setMotDePasse("test-only-hash"); member = users.saveAndFlush(member);
        var activity = new Activite(); activity.setTitre("Paiement activité test"); activity.setCreateur(member);
        activity.setStatut(StatutActivite.PUBLIEE); activity.setVisibilite(VisibiliteActivite.PUBLIC);
        activity.setCapaciteMax(1); activity.setGratuite(false); activity.setPrix(BigDecimal.TEN);
        activity.setDateDebut(LocalDateTime.now().plusDays(1)); activity.setDateFin(activity.getDateDebut().plusHours(1));
        activity = activities.saveAndFlush(activity);
        var payment = service.prepare(activity.getId(), member, BigDecimal.TEN, "STRIPE");
        var session = new Session(); session.setId("cs_fixture_" + payment.getId());
        session.setMode("payment"); session.setStatus("complete"); session.setPaymentStatus("paid");
        session.setCurrency("eur"); session.setAmountTotal(1000L); session.setPaymentIntent("pi_fixture_" + payment.getId());
        session.setMetadata(Map.of("activity_payment_id", payment.getId().toString()));
        service.attach(activity.getId(), payment.getId(), session.getId(), "https://checkout.stripe.com/test", "STRIPE");
        return new Attempt(member, payment, session);
    }

    @Test void concurrentRecoveryAndWebhookConfirmExactlyOneExistingPaymentAndRegistration() throws Exception {
        var a = attempt();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            var recovery = pool.submit(() -> { start.await(); return service.recover(a.payment().getId(), a.member().getEmail(), a.session()); });
            var webhook = pool.submit(() -> { start.await(); service.handleStripe(a.session(), true); return true; });
            start.countDown();
            assertThat(recovery.get(20, TimeUnit.SECONDS).getStatutPaiement()).isEqualTo(StatutPaiement.PAYE);
            assertThat(webhook.get(20, TimeUnit.SECONDS)).isTrue();
        }
        var paidAt = payments.findById(a.payment().getId()).orElseThrow().getDatePaiement();
        service.recover(a.payment().getId(), a.member().getEmail(), a.session());
        service.handleStripe(a.session(), true);
        a.session().setStatus("expired"); a.session().setPaymentStatus("unpaid");
        service.handleStripe(a.session(), false);
        var saved = payments.findById(a.payment().getId()).orElseThrow();
        assertThat(saved.getStatutPaiement()).isEqualTo(StatutPaiement.PAYE);
        assertThat(saved.getDatePaiement()).isEqualTo(paidAt);
        assertThat(saved.getCheckoutUrl()).isNull();
        assertThat(payments.findByActiviteId(a.payment().getActivite().getId())).hasSize(1);
        assertThat(registrations.countByActiviteIdAndStatutIn(a.payment().getActivite().getId(), List.of(StatutInscription.PAYEE))).isEqualTo(1);
    }

    @Test void mismatchedRemoteAmountRollsBackWithoutChangingRegistration() {
        var a = attempt(); a.session().setAmountTotal(1L);
        assertThatThrownBy(() -> service.recover(a.payment().getId(), a.member().getEmail(), a.session()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(payments.findById(a.payment().getId()).orElseThrow().getStatutPaiement()).isEqualTo(StatutPaiement.EN_ATTENTE);
        assertThat(registrations.countByActiviteIdAndStatutIn(a.payment().getActivite().getId(), List.of(StatutInscription.EN_ATTENTE_PAIEMENT))).isEqualTo(1);
    }

    @Test void verifiedExpirationReleasesExactlyOneSeatAndCannotCancelTheNextAttempt() {
        var a = attempt();
        a.session().setStatus("open"); a.session().setPaymentStatus("unpaid");
        a.session().setExpiresAt(System.currentTimeMillis()/1000 - 1);
        service.recover(a.payment().getId(), a.member().getEmail(), a.session());
        assertThat(registrations.countByActiviteIdAndStatutIn(a.payment().getActivite().getId(), List.of(StatutInscription.EN_ATTENTE_PAIEMENT))).isEqualTo(1);
        a.session().setStatus("expired");
        assertThat(service.recover(a.payment().getId(), a.member().getEmail(), a.session()).getStatutPaiement()).isEqualTo(StatutPaiement.ANNULE);
        var next = service.prepare(a.payment().getActivite().getId(), a.member(), BigDecimal.TEN, "STRIPE");
        service.handleStripe(a.session(), false);
        assertThat(next.getId()).isNotEqualTo(a.payment().getId());
        assertThat(payments.findByActiviteId(a.payment().getActivite().getId())).hasSize(2);
        assertThat(registrations.countByActiviteIdAndStatutIn(a.payment().getActivite().getId(), List.of(StatutInscription.EN_ATTENTE_PAIEMENT))).isEqualTo(1);
    }

    @Test void concurrentDoubleClickReusesOneCommittedAttemptAndOneIdempotencyKey() throws Exception {
        var a = attempt();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            Callable<SoutienFinancier> retry = () -> {
                start.await(); return service.prepare(a.payment().getActivite().getId(), a.member(), BigDecimal.TEN, "STRIPE");
            };
            var first = pool.submit(retry); var second = pool.submit(retry); start.countDown();
            var left = first.get(20, TimeUnit.SECONDS); var right = second.get(20, TimeUnit.SECONDS);
            assertThat(left.getId()).isEqualTo(right.getId()).isEqualTo(a.payment().getId());
            assertThat(left.getActivityRequestKey()).isEqualTo(right.getActivityRequestKey());
        }
        assertThat(payments.findByActiviteId(a.payment().getActivite().getId())).hasSize(1);
        assertThat(registrations.countByActiviteIdAndStatutIn(a.payment().getActivite().getId(), List.of(StatutInscription.EN_ATTENTE_PAIEMENT))).isEqualTo(1);
    }
}
