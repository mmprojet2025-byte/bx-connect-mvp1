package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.dto.ActiviteRequest;
import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real controllers, security, services and MySQL; only side-effect notifications are isolated. */
@SpringBootTest(properties = {
        "features.payments.stripe.enabled=false", "app.password-reset.email-enabled=false",
        "jwt.secret=group-reassignment-isolated-test-key-only-2026",
        "spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class GroupeReferentActivitiesMySqlTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("group_referent_activities_test").withUsername("test").withPassword("disposable_test");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", mysql::getJdbcUrl);
        p.add("spring.datasource.username", mysql::getUsername);
        p.add("spring.datasource.password", mysql::getPassword);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired GroupeService groupService;
    @Autowired ActiviteService activityService;
    @Autowired GroupeRepository groups;
    @Autowired UserRepository users;
    @Autowired ActiviteRepository activities;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @MockitoBean NotificationService notifications;

    @Test void reassignmentTransfersApiAccessWithoutChangingAuthorOrTerminalStates() throws Exception {
        User admin = actor(Role.ADMIN), previous = actor(Role.REFERENT), next = actor(Role.REFERENT), outsider = actor(Role.REFERENT);
        Groupe group = group(previous), other = group(outsider);
        List<Activite> records = new ArrayList<>();
        for (StatutActivite state : StatutActivite.values()) records.add(activity(group, previous, state));
        Activite otherActivity = activity(other, outsider, StatutActivite.BROUILLON);

        mvc.perform(patch("/api/admin/groupes/{g}/referent/{r}", group.getId(), next.getId())
                .with(user(admin.getEmail()).roles("ADMIN"))).andExpect(status().isOk());

        for (Activite before : records) {
            assertThat(jdbc.queryForObject("SELECT referent_assigne_id FROM activites WHERE id=?", Long.class, before.getId())).isEqualTo(next.getId());
            assertThat(jdbc.queryForObject("SELECT createur_id FROM activites WHERE id=?", Long.class, before.getId())).isEqualTo(previous.getId());
            assertThat(jdbc.queryForObject("SELECT statut FROM activites WHERE id=?", String.class, before.getId())).isEqualTo(before.getStatut().name());
            assertThat(jdbc.queryForObject("SELECT titre FROM activites WHERE id=?", String.class, before.getId())).isEqualTo(before.getTitre());
            mvc.perform(get("/api/activites/{id}", before.getId()).with(user(next.getEmail()).roles("REFERENT")))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/activites/{id}", before.getId()).with(user(previous.getEmail()).roles("REFERENT")))
                    .andExpect(status().is4xxClientError());
            mvc.perform(get("/api/activites/{id}", before.getId()).with(user(outsider.getEmail()).roles("REFERENT")))
                    .andExpect(status().is4xxClientError());
            mvc.perform(get("/api/activites/{id}", before.getId()).with(user(admin.getEmail()).roles("ADMIN")))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/activites/mes-activites").with(user(next.getEmail()).roles("REFERENT")))
                    .andExpect(jsonPath("$[*].id", org.hamcrest.Matchers.hasItem(before.getId().intValue())));
        }
        mvc.perform(get("/api/activites/mes-activites").with(user(previous.getEmail()).roles("REFERENT")))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        assertThat(jdbc.queryForObject("SELECT referent_assigne_id FROM activites WHERE id=?", Long.class, otherActivity.getId())).isEqualTo(outsider.getId());
        mvc.perform(put("/api/activites/{id}", otherActivity.getId()).with(user(next.getEmail()).roles("REFERENT"))
                .contentType("application/json").content(body(otherActivity)))
                .andExpect(status().isForbidden());

        for (Activite activity : records) {
            String body = body(activity);
            for (User denied : List.of(previous, outsider)) {
                mvc.perform(put("/api/activites/{id}", activity.getId()).with(user(denied.getEmail()).roles("REFERENT"))
                        .contentType("application/json").content(body)).andExpect(status().isForbidden());
            }
            for (User allowed : List.of(next, admin)) {
                var result = mvc.perform(put("/api/activites/{id}", activity.getId()).with(user(allowed.getEmail()).roles(allowed.getRole().name()))
                        .contentType("application/json").content(body));
                if (activity.getStatut() == StatutActivite.BROUILLON || activity.getStatut() == StatutActivite.PUBLIEE)
                    result.andExpect(status().isOk());
                else result.andExpect(status().isBadRequest());
            }
        }
    }

    @ParameterizedTest @ValueSource(strings={"REFERENT", "MEMBRE", "PARTENAIRE", "SUPER_ADMIN"})
    void onlyAdminCanReassignThroughTheApi(String role) throws Exception {
        User old = actor(Role.REFERENT), next = actor(Role.REFERENT), denied = actor(Role.valueOf(role));
        Groupe group = group(old);
        Activite activity = activity(group, old, StatutActivite.BROUILLON);
        mvc.perform(patch("/api/admin/groupes/{g}/referent/{r}", group.getId(), next.getId())
                .with(user(denied.getEmail()).roles(role))).andExpect(status().isForbidden());
        assertAssignment(group, activity, old);
    }

    @Test void rollbackRestoresBothGroupAndActivities() {
        User old = actor(Role.REFERENT), next = actor(Role.REFERENT);
        Groupe group = group(old);
        Activite activity = activity(group, old, StatutActivite.PUBLIEE);
        assertThatThrownBy(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            groupService.assignerReferent(group.getId(), next.getId());
            assertAssignment(group, activity, next);
            throw new IllegalStateException("Simulated failure after reassignment");
        })).hasMessageContaining("Simulated failure");
        assertAssignment(group, activity, old);
    }

    @Test void assigningCurrentReferentAlsoRepairsAnExistingMismatch() {
        User old = actor(Role.REFERENT), current = actor(Role.REFERENT);
        Groupe group = group(current);
        Activite activity = activity(group, old, StatutActivite.TERMINEE);
        groupService.assignerReferent(group.getId(), current.getId());
        assertAssignment(group, activity, current);
        assertThat(jdbc.queryForObject("SELECT createur_id FROM activites WHERE id=?", Long.class, activity.getId())).isEqualTo(old.getId());
        assertThat(jdbc.queryForObject("SELECT statut FROM activites WHERE id=?", String.class, activity.getId())).isEqualTo("TERMINEE");
    }

    @Test void archivedGroupCannotBeReassigned() throws Exception {
        User old = actor(Role.REFERENT), next = actor(Role.REFERENT), admin = actor(Role.ADMIN);
        Groupe group = group(old);
        Activite activity = activity(group, old, StatutActivite.TERMINEE);
        groupService.supprimerGroupe(group.getId(), admin.getEmail());
        mvc.perform(patch("/api/admin/groupes/{g}/referent/{r}", group.getId(), next.getId())
                .with(user(admin.getEmail()).roles("ADMIN"))).andExpect(status().isBadRequest());
        assertAssignment(group, activity, old);
        assertThat(jdbc.queryForObject("SELECT statut FROM groupes WHERE id=?", String.class, group.getId())).isEqualTo("ARCHIVE");
    }

    @Test void concurrentReassignmentModificationAndCreationKeepOneResponsibleWithoutDeadlock() throws Exception {
        User old = actor(Role.REFERENT), next = actor(Role.REFERENT), admin = actor(Role.ADMIN);
        Groupe group = group(old);
        Activite activity = activity(group, old, StatutActivite.BROUILLON);
        var pool = Executors.newFixedThreadPool(3);
        try {
            for (int round = 0; round < 8; round++) {
                User target = round % 2 == 0 ? next : old;
                var start = new CountDownLatch(1);
                var assignment = pool.submit(() -> { start.await(); return groupService.assignerReferent(group.getId(), target.getId()); });
                var edition = pool.submit(() -> { start.await(); return activityService.modifier(activity.getId(), request(activity), admin.getEmail()); });
                var creation = pool.submit(() -> { start.await(); return activityService.creer(request(activity), admin.getEmail()); });
                start.countDown();
                assignment.get(20, TimeUnit.SECONDS); edition.get(20, TimeUnit.SECONDS); creation.get(20, TimeUnit.SECONDS);
                assertAssignment(group, activity, target);
                assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM activites WHERE groupe_id=? AND (referent_assigne_id IS NULL OR referent_assigne_id<>?)",
                        Long.class, group.getId(), target.getId())).isZero();
            }
        } finally { pool.shutdownNow(); }
    }

    private void assertAssignment(Groupe group, Activite activity, User referent) {
        assertThat(jdbc.queryForObject("SELECT referent_id FROM groupes WHERE id=?", Long.class, group.getId())).isEqualTo(referent.getId());
        assertThat(jdbc.queryForObject("SELECT referent_assigne_id FROM activites WHERE id=?", Long.class, activity.getId())).isEqualTo(referent.getId());
    }
    private String body(Activite activity) throws Exception {
        com.fasterxml.jackson.databind.node.ObjectNode body = json.valueToTree(request(activity));
        // The Web does not request an explicit null assignee when editing a group activity.
        body.remove("referentAssigneId");
        return json.writeValueAsString(body);
    }
    private ActiviteRequest request(Activite activity) {
        var request = new ActiviteRequest(); request.setTitre(activity.getTitre()); request.setDescription("Description conservée");
        request.setLieu("Bruxelles"); request.setDateDebut(activity.getDateDebut()); request.setDateFin(activity.getDateFin());
        request.setCapaciteMax(10); request.setGroupeId(activity.getGroupe().getId()); request.setVisibilite(VisibiliteActivite.PRIVE_GROUPE);
        return request;
    }
    private Activite activity(Groupe group, User author, StatutActivite state) {
        Activite a = new Activite(); a.setTitre("Activité " + UUID.randomUUID()); a.setDescription("Description conservée"); a.setLieu("Bruxelles");
        a.setGroupe(group); a.setReferentAssigne(author); a.setCreateur(author); a.setStatut(state);
        a.setVisibilite(VisibiliteActivite.PRIVE_GROUPE); a.setDateDebut(LocalDateTime.now().plusDays(5).withNano(0));
        a.setDateFin(a.getDateDebut().plusHours(1)); a.setCapaciteMax(10); return activities.saveAndFlush(a);
    }
    private Groupe group(User referent) {
        Groupe g = new Groupe(); g.setNom("Groupe isolé " + UUID.randomUUID()); g.setReferent(referent);
        g.setStatut(StatutGroupe.VALIDE); g.setActif(true); return groups.saveAndFlush(g);
    }
    private User actor(Role role) {
        User u = new User(); u.setEmail(UUID.randomUUID()+"@test.invalid"); u.setNom("Test"); u.setPrenom("Test");
        u.setMotDePasse("unused"); u.setRole(role); u.setActif(true); return users.saveAndFlush(u);
    }
}
