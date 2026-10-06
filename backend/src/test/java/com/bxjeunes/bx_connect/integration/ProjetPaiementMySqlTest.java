package com.bxjeunes.bx_connect.integration;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.*;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.*;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
@DataJpaTest(showSql=false)
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({ProjetParticipationPaiementService.class, ProjetService.class})
@Testcontainers
@Transactional(propagation=Propagation.NOT_SUPPORTED)
class ProjetPaiementMySqlTest {
    @Container static final MySQLContainer<?> mysql=new MySQLContainer<>("mysql:8.0")
        .withDatabaseName("project_payment_test").withUsername("test").withPassword("disposable_test");
    @DynamicPropertySource static void db(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url",mysql::getJdbcUrl); p.add("spring.datasource.username",mysql::getUsername);
        p.add("spring.datasource.password",mysql::getPassword);
        p.add("spring.jpa.hibernate.ddl-auto",()->"validate"); p.add("spring.flyway.enabled",()->"true");
    }
    @Autowired ProjetParticipationPaiementService service;
    @Autowired ProjetService projectService;
    @MockitoBean AuditLogService auditLog;
    @Autowired UserRepository users;
    @Autowired ProjetRepository projects;
    @Autowired ProjetParticipationPaiementRepository payments;
    @Autowired ParticipationProjetRepository participations;
    @MockitoBean NotificationService notifications;

    User member() {
        var u=new User(); u.setEmail(UUID.randomUUID()+"@example.org");u.setPrenom("Test");u.setNom("Membre");
        u.setRole(Role.MEMBRE);u.setActif(true);u.setMotDePasse("test-only-hash");
        return users.saveAndFlush(u);
    }
    Projet project(User u) {
        var p=new Projet();p.setTitre("Projet payant");p.setPorteur(u);p.setVisibilite(VisibiliteProjet.PUBLIC);
        p.setStatut(StatutProjet.APPROUVE);p.setPrixParticipation(new BigDecimal("5.00"));
        return projects.saveAndFlush(p);
    }
    Session remote(ProjetParticipationPaiement p) {
        var s=new Session();s.setId("cs_fixture_"+p.getId());s.setMode("payment");s.setStatus("complete");s.setPaymentStatus("paid");
        s.setCurrency("eur");s.setAmountTotal(500L);s.setPaymentIntent("pi_fixture_"+p.getId());
        s.setMetadata(Map.of("project_participation_payment_id",p.getId().toString()));return s;
    }
    @Test void concurrentPreparationsReuseOneCommittedAttempt() throws Exception {
        var user=member();var project=project(user);
        try (var pool=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            Callable<Long> run=()->{start.await();return service.prepare(project.getId(),user.getEmail()).getId();};
            var a=pool.submit(run);var b=pool.submit(run);start.countDown();
            assertThat(a.get(15,TimeUnit.SECONDS)).isEqualTo(b.get(15,TimeUnit.SECONDS));
        }
        assertThat(payments.findByProjetIdOrderByDateCreationDesc(project.getId())).hasSize(1);
        assertThat(participations.findByProjetId(project.getId())).isEmpty();
    }
    @Test void concurrentWebhookReplayCreatesOneReceiptParticipationAndNotification() throws Exception {
        var user=member();var project=project(user);var p=service.prepare(project.getId(),user.getEmail());
        var session=remote(p);
        try (var pool=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            Callable<Void> run=()->{start.await();service.handle(session,true);return null;};
            var a=pool.submit(run);var b=pool.submit(run);start.countDown();a.get(15,TimeUnit.SECONDS);b.get(15,TimeUnit.SECONDS);
        }
        assertThat(participations.findByProjetId(project.getId())).hasSize(1);
        var receipt=service.receipt(p.getId(),user.getEmail());
        assertThat(receipt.numeroRecu()).isEqualTo("BX-PROJET-"+p.getId());
        assertThat(receipt.montant()).isEqualByComparingTo("5.00");
        assertThat(receipt.statut()).isEqualTo(StatutPaiement.PAYE);
        verify(notifications,times(1)).creer(any(),anyString(),anyString(),eq("RECU_PROJET"),eq("/mes-factures?recu="+p.getId()));
    }
    @Test void rejectedAmountRollsBackAndNeverGeneratesReceipt() {
        var u=member();var p=service.prepare(project(u).getId(),u.getEmail());var s=remote(p);s.setAmountTotal(1L);
        assertThatThrownBy(()->service.handle(s,true)).isInstanceOf(IllegalArgumentException.class);
        assertThat(payments.findById(p.getId()).orElseThrow().getStatut()).isEqualTo(StatutPaiement.EN_ATTENTE);
        assertThatThrownBy(()->service.receipt(p.getId(),u.getEmail())).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void capacitySerializesCompetingPaidCheckoutsAndExpirationReleasesSeat() throws Exception {
        var first=member(); var second=member(); var p=project(first); p.setCapacite(1); projects.saveAndFlush(p);
        try (var pool=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            java.util.function.Function<User, Boolean> attempt=u->{
                try { start.await(); service.prepare(p.getId(),u.getEmail()); return true; }
                catch (IllegalArgumentException e) { assertThat(e).hasMessageContaining("complet"); return false; }
                catch (InterruptedException e) { throw new RuntimeException(e); }
            };
            var a=pool.submit(()->attempt.apply(first)); var b=pool.submit(()->attempt.apply(second)); start.countDown();
            assertThat(java.util.List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
        }
        var pending=payments.findByProjetIdOrderByDateCreationDesc(p.getId()).get(0);
        var expired=remote(pending); expired.setStatus("expired"); expired.setPaymentStatus("unpaid");
        service.handle(expired,false);
        assertThat(service.prepare(p.getId(),second.getEmail()).getStatut()).isEqualTo(StatutPaiement.EN_ATTENTE);
    }
    @Test void capacitySerializesCompetingFreeRegistrations() throws Exception {
        var first=member(); var second=member(); var p=project(first); p.setPrixParticipation(BigDecimal.ZERO);
        p.setCapacite(1); projects.saveAndFlush(p);
        try (var pool=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            java.util.function.Function<User, Boolean> attempt=u->{
                try { start.await(); projectService.rejoindrProjet(p.getId(),u.getEmail()); return true; }
                catch (IllegalArgumentException e) { assertThat(e).hasMessageContaining("complet"); return false; }
                catch (InterruptedException e) { throw new RuntimeException(e); }
            };
            var a=pool.submit(()->attempt.apply(first)); var b=pool.submit(()->attempt.apply(second)); start.countDown();
            assertThat(java.util.List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
        }
        assertThat(participations.findByProjetId(p.getId())).hasSize(1);
    }
    @Test void savesScheduleAndCoverAndBlocksFreeRegistrationAfterDeadline() {
        var u=member(); var p=project(u); p.setPrixParticipation(BigDecimal.ZERO); p.setCapacite(10);
        p.setDateExecution(java.time.LocalDate.now().plusDays(5));
        p.setDateLimiteParticipation(java.time.LocalDate.now().minusDays(1));
        p.setImageUrl("http://localhost:8080/uploads/projets/12345678-1234-1234-1234-123456789012.png");
        projects.saveAndFlush(p);
        var saved=projects.findById(p.getId()).orElseThrow();
        assertThat(saved.getDateExecution()).isEqualTo(p.getDateExecution());
        assertThat(saved.getImageUrl()).isEqualTo(p.getImageUrl());
        assertThatThrownBy(()->projectService.rejoindrProjet(p.getId(),u.getEmail())).hasMessageContaining("clôturées");
        assertThat(participations.findByProjetId(p.getId())).isEmpty();
    }
}
