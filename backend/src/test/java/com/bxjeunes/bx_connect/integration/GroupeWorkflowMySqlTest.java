package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.dto.admin.AdminGroupeRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(showSql=false)
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(GroupeService.class)
@Testcontainers
class GroupeWorkflowMySqlTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("group_workflow_test").withUsername("test").withPassword("disposable_test");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", mysql::getJdbcUrl);
        p.add("spring.datasource.username", mysql::getUsername);
        p.add("spring.datasource.password", mysql::getPassword);
        p.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        p.add("spring.flyway.enabled", () -> "true");
    }
    @Autowired GroupeService service;
    @Autowired GroupeRepository groups;
    @Autowired MembreGroupeRepository memberships;
    @Autowired UserRepository users;
    @Autowired ActiviteRepository activities;
    @Autowired ProjetRepository projects;
    @Autowired EntityManager em;
    @MockitoBean NotificationService notifications;
    @MockitoBean AuditLogService audit;

    @Test void archivePreservesActualForeignKeysAndFreesMembershipForAnotherGroup() {
        User ref = user(Role.REFERENT), member = user(Role.MEMBRE);
        Groupe group = group(ref);
        var request = service.rejoindreGroupe(group.getId(), member.getEmail());
        service.accepterAdhesion(request.getId(), ref.getEmail());
        Activite activity = new Activite(); activity.setTitre("Historique"); activity.setCreateur(ref);
        activity.setGroupe(group); activity.setReferentAssigne(ref);
        activity.setDateDebut(LocalDateTime.now().plusDays(2)); activity.setDateFin(activity.getDateDebut().plusHours(1));
        activity.setStatut(StatutActivite.PUBLIEE);
        Long activityId = activities.saveAndFlush(activity).getId();
        Projet project = new Projet(); project.setTitre("Historique"); project.setPorteur(member); project.setGroupe(group);
        Long projectId = projects.saveAndFlush(project).getId();
        service.supprimerGroupe(group.getId()); em.flush(); em.clear();
        Groupe archived = groups.findById(group.getId()).orElseThrow();
        assertThat(archived.getStatut()).isEqualTo(StatutGroupe.ARCHIVE);
        assertThat(archived.isActif()).isFalse();
        assertThat(memberships.findById(request.getId()).orElseThrow().getStatut()).isEqualTo(StatutMembre.ACCEPTE);
        assertThat(activities.findById(activityId).orElseThrow().getGroupe().getId()).isEqualTo(group.getId());
        assertThat(activities.findById(activityId).orElseThrow().getStatut()).isEqualTo(StatutActivite.PUBLIEE);
        assertThat(projects.findById(projectId).orElseThrow().getGroupe().getId()).isEqualTo(group.getId());
        assertThat(service.listerGroupesPublics()).noneMatch(g -> g.id().equals(group.getId()));
        assertThat(memberships.estDejaMembreActif(member.getId())).isFalse();
        Groupe next = group(ref);
        var second = service.rejoindreGroupe(next.getId(), member.getEmail());
        service.accepterAdhesion(second.getId(), ref.getEmail());
        assertThat(memberships.findFirstByUserIdAndStatut(member.getId(), StatutMembre.ACCEPTE).orElseThrow().getGroupe().getId()).isEqualTo(next.getId());
    }
    @Test void migrationSupportsSuspensionAndDepartureWithoutLosingTheMembershipRow() {
        User ref = user(Role.REFERENT), member = user(Role.MEMBRE);
        Groupe group = group(ref);
        Long id = service.rejoindreGroupe(group.getId(), member.getEmail()).getId();
        service.accepterAdhesion(id, ref.getEmail());
        service.changerAppartenance(id, ref.getEmail(), false); em.flush(); em.clear();
        assertThat(memberships.findById(id).orElseThrow().getStatut()).isEqualTo(StatutMembre.SUSPENDU);
        assertThat(users.findById(member.getId()).orElseThrow().isActif()).isTrue();
        service.changerAppartenance(id, ref.getEmail(), true);
        service.quitterGroupe(group.getId(), member.getEmail()); em.flush(); em.clear();
        assertThat(memberships.findById(id).orElseThrow().getStatut()).isEqualTo(StatutMembre.QUITTE);
        assertThat(service.rejoindreGroupe(group.getId(), member.getEmail()).getId()).isEqualTo(id);
    }
    @Test void archivedPendingRequestDoesNotBlockAnotherRequest() {
        User ref = user(Role.REFERENT), member = user(Role.MEMBRE);
        Groupe group = group(ref);
        Long id = service.rejoindreGroupe(group.getId(), member.getEmail()).getId();
        service.supprimerGroupe(group.getId());
        assertThat(service.rejoindreGroupe(group(ref).getId(), member.getEmail()).getStatut()).isEqualTo(StatutMembre.EN_ATTENTE);
        assertThat(memberships.findById(id)).isPresent();
    }
    @Test void adminCreationAndReassignmentRequireAnActiveReferent() {
        User ref = user(Role.REFERENT);
        AdminGroupeRequest request = new AdminGroupeRequest(); request.setNom("Nouveau"); request.setReferentId(ref.getId());
        Long id = service.creerGroupeParAdmin(request).getId();
        assertThat(groups.findById(id).orElseThrow().getStatut()).isEqualTo(StatutGroupe.VALIDE);
        User other = user(Role.REFERENT);
        assertThat(service.assignerReferent(id, other.getId()).getReferentId()).isEqualTo(other.getId());
        other.setActif(false); users.saveAndFlush(other);
        assertThatThrownBy(() -> service.assignerReferent(id, other.getId())).hasMessageContaining("inactif");
    }
    @Test
    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentRequestsCannotCreateTwoPendingMemberships() throws Exception {
        User ref = user(Role.REFERENT), member = user(Role.MEMBRE);
        Groupe first = group(ref), second = group(ref);
        assertThat(race(
                () -> service.rejoindreGroupe(first.getId(), member.getEmail()),
                () -> service.rejoindreGroupe(second.getId(), member.getEmail()))).isEqualTo(1);
        assertThat(memberships.findByUserId(member.getId())).hasSize(1);
    }

    @Test
    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentDecisionsCannotExceedCapacity() throws Exception {
        User ref = user(Role.REFERENT), first = user(Role.MEMBRE), second = user(Role.MEMBRE);
        Groupe group = group(ref); group.setCapaciteMax(1); groups.saveAndFlush(group);
        Long firstId = service.rejoindreGroupe(group.getId(), first.getEmail()).getId();
        Long secondId = service.rejoindreGroupe(group.getId(), second.getEmail()).getId();
        assertThat(race(
                () -> service.accepterAdhesion(firstId, ref.getEmail()),
                () -> service.accepterAdhesion(secondId, ref.getEmail()))).isEqualTo(1);
        assertThat(memberships.countByGroupeIdAndStatut(group.getId(), StatutMembre.ACCEPTE)).isEqualTo(1);
    }

    private int race(Runnable first, Runnable second) throws Exception {
        var start = new java.util.concurrent.CountDownLatch(1);
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var results = new java.util.ArrayList<java.util.concurrent.Future<Boolean>>();
            for (Runnable action : java.util.List.of(first, second)) results.add(pool.submit(() -> {
                start.await();
                try { action.run(); return true; }
                catch (RuntimeException rejection) {
                    if (rejection.getMessage().contains("demande d'adhesion en attente") || rejection.getMessage().contains("capacité maximale")) return false;
                    throw rejection;
                }
            }));
            start.countDown();
            int success = 0;
            for (var result : results) if (result.get(20, java.util.concurrent.TimeUnit.SECONDS)) success++;
            return success;
        } finally { pool.shutdownNow(); }
    }

    private Groupe group(User ref) {
        AdminGroupeRequest request = new AdminGroupeRequest(); request.setNom("Groupe"); request.setReferentId(ref.getId());
        return groups.findById(service.creerGroupeParAdmin(request).getId()).orElseThrow();
    }
    private User user(Role role) {
        User u = new User(); u.setEmail(UUID.randomUUID()+"@test.invalid"); u.setNom("Test"); u.setPrenom("Test");
        u.setMotDePasse("unused"); u.setRole(role); u.setActif(true); return users.saveAndFlush(u);
    }
}
