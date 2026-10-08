package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.entity.*;
import com.bxjeunes.bx_connect.repository.*;
import com.bxjeunes.bx_connect.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real API authorization and persisted effects, only on disposable MySQL. */
@SpringBootTest(properties = {
        "features.payments.stripe.enabled=false", "app.password-reset.email-enabled=false",
        "jwt.secret=group-permissions-isolated-test-key-only-2026",
        "spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class GroupePermissionsMySqlTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("group_permissions_test").withUsername("test").withPassword("disposable_test");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", mysql::getJdbcUrl);
        p.add("spring.datasource.username", mysql::getUsername);
        p.add("spring.datasource.password", mysql::getPassword);
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired GroupeRepository groups;
    @Autowired UserRepository users;
    @Autowired MembreGroupeRepository memberships;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean NotificationService notifications;

    @ParameterizedTest @ValueSource(strings={"REFERENT","MEMBRE","PARTENAIRE","SUPER_ADMIN"})
    void directCreationRequestsRequireAdminOnBothUrls(String role) throws Exception {
        User actor = actor(Role.valueOf(role)), referent = actor(Role.REFERENT);
        long before = groups.count();
        for (String endpoint : new String[]{"/api/groupes","/api/admin/groupes"}) {
            mvc.perform(post(endpoint).with(user(actor.getEmail()).roles(role)).contentType("application/json")
                    .content(json.writeValueAsString(Map.of("nom","Interdit","referentId",referent.getId()))))
                    .andExpect(status().isForbidden());
        }
        assertThat(groups.count()).isEqualTo(before);
    }

    @ParameterizedTest @CsvSource({"/api/groupes,201", "/api/admin/groupes,200"})
    void bothCreationUrlsUseAnActiveReferentAndImmediatelyValidateTheGroup(String endpoint, int expected) throws Exception {
        User admin = actor(Role.ADMIN), referent = actor(Role.REFERENT);
        long before = groups.count();
        var response = mvc.perform(post(endpoint).with(user(admin.getEmail()).roles("ADMIN")).contentType("application/json")
                        .content(json.writeValueAsString(Map.of("nom","Création canonique","referentId",referent.getId()))))
                .andExpect(status().is(expected)).andExpect(jsonPath("$.statut").value("VALIDE"))
                .andExpect(jsonPath("$.actif").value(true)).andExpect(jsonPath("$.referentId").value(referent.getId()))
                .andReturn().getResponse();
        long groupId = json.readTree(response.getContentAsString()).get("id").asLong();
        assertThat(groups.count()).isEqualTo(before + 1);
        assertThat(jdbc.queryForObject("SELECT referent_id FROM groupes WHERE id=?", Long.class, groupId)).isEqualTo(referent.getId());
        for (Object payload : new Object[]{Map.of("nom","Sans référent"), Map.of("nom","ADMIN n'est pas référent","referentId",admin.getId())}) {
            mvc.perform(post(endpoint).with(user(admin.getEmail()).roles("ADMIN")).contentType("application/json")
                    .content(json.writeValueAsString(payload))).andExpect(status().is4xxClientError());
        }
        assertThat(groups.count()).isEqualTo(before + 1);
    }

    @ParameterizedTest @ValueSource(strings={"ADMIN","MEMBRE","PARTENAIRE","SUPER_ADMIN","OUTSIDE_REFERENT"})
    void noAlternativeEndpointLetsOtherActorsDecideMemberships(String role) throws Exception {
        User referent = actor(Role.REFERENT), member = actor(Role.MEMBRE);
        User denied = role.equals("OUTSIDE_REFERENT") ? actor(Role.REFERENT) : actor(Role.valueOf(role));
        Groupe group = group(referent);
        MembreGroupe membership = membership(group, member, StatutMembre.EN_ATTENTE);
        for (String action : new String[]{"accepter","refuser"}) {
            for (String endpoint : new String[]{"/api/groupes/adhesions/"+membership.getId()+"/"+action,
                    "/api/referent/groupes/"+group.getId()+"/demandes/"+membership.getId()+"/"+action}) {
                mvc.perform(patch(endpoint).with(user(denied.getEmail()).roles(denied.getRole().name()))).andExpect(status().isForbidden());
            }
        }
        assertMembership(membership, StatutMembre.EN_ATTENTE);
    }

    @ParameterizedTest @CsvSource({"legacy,accepter,ACCEPTE", "legacy,refuser,REFUSE", "scoped,accepter,ACCEPTE", "scoped,refuser,REFUSE"})
    void assignedReferentCanDecideOnceThroughEitherEndpoint(String style, String action, StatutMembre target) throws Exception {
        User referent = actor(Role.REFERENT), member = actor(Role.MEMBRE);
        Groupe group = group(referent);
        MembreGroupe membership = membership(group, member, StatutMembre.EN_ATTENTE);
        String endpoint = style.equals("legacy") ? "/api/groupes/adhesions/"+membership.getId()+"/"+action
                : "/api/referent/groupes/"+group.getId()+"/demandes/"+membership.getId()+"/"+action;
        mvc.perform(patch(endpoint).with(user(referent.getEmail()).roles("REFERENT"))).andExpect(status().isOk());
        assertMembership(membership, target);
        mvc.perform(patch(endpoint).with(user(referent.getEmail()).roles("REFERENT"))).andExpect(status().is4xxClientError());
        assertMembership(membership, target);
    }

    @Test void archivedGroupRemainsReadOnlyAcrossOldUrlsWhileHistoryIsReadable() throws Exception {
        User admin = actor(Role.ADMIN), referent = actor(Role.REFERENT), next = actor(Role.REFERENT), member = actor(Role.MEMBRE);
        Groupe group = group(referent);
        MembreGroupe accepted = membership(group, member, StatutMembre.ACCEPTE);
        MembreGroupe pending = membership(group, actor(Role.MEMBRE), StatutMembre.EN_ATTENTE);
        mvc.perform(delete("/api/groupes/{id}",group.getId()).with(user(admin.getEmail()).roles("ADMIN")))
                .andExpect(status().isNoContent());
        for (User actor : new User[]{admin,referent}) {
            mvc.perform(put("/api/groupes/{id}",group.getId()).with(user(actor.getEmail()).roles(actor.getRole().name()))
                    .contentType("application/json").content("{\"nom\":\"Modification interdite\"}"))
                    .andExpect(status().isBadRequest());
            mvc.perform(get("/api/groupes/{id}/membres",group.getId()).with(user(actor.getEmail()).roles(actor.getRole().name())))
                    .andExpect(status().isOk());
        }
        mvc.perform(patch("/api/admin/groupes/{g}/referent/{r}",group.getId(),next.getId()).with(user(admin.getEmail()).roles("ADMIN")))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/groupes/{id}/quitter",group.getId()).with(user(member.getEmail()).roles("MEMBRE")))
                .andExpect(status().isBadRequest());
        for (String action : new String[]{"accepter","refuser"}) {
            mvc.perform(patch("/api/groupes/adhesions/{id}/"+action,pending.getId()).with(user(referent.getEmail()).roles("REFERENT")))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(patch("/api/referent/groupes/{g}/membres/{m}/desactiver",group.getId(),accepted.getId())
                .with(user(referent.getEmail()).roles("REFERENT"))).andExpect(status().isBadRequest());
        assertMembership(accepted, StatutMembre.ACCEPTE); assertMembership(pending, StatutMembre.EN_ATTENTE);
        assertThat(jdbc.queryForObject("SELECT nom FROM groupes WHERE id=?",String.class,group.getId())).isEqualTo(group.getNom());
        assertThat(jdbc.queryForObject("SELECT statut FROM groupes WHERE id=?",String.class,group.getId())).isEqualTo("ARCHIVE");
        assertThat(jdbc.queryForObject("SELECT referent_id FROM groupes WHERE id=?",Long.class,group.getId())).isEqualTo(referent.getId());
    }

    private void assertMembership(MembreGroupe membership, StatutMembre expected) {
        assertThat(jdbc.queryForObject("SELECT statut FROM membres_groupes WHERE id=?",String.class,membership.getId())).isEqualTo(expected.name());
    }
    private MembreGroupe membership(Groupe group, User member, StatutMembre state) {
        var row = new MembreGroupe(member, group); row.setStatut(state); return memberships.saveAndFlush(row);
    }
    private Groupe group(User referent) {
        Groupe group = new Groupe(); group.setNom("Historique préservé"); group.setReferent(referent);
        group.setStatut(StatutGroupe.VALIDE); group.setActif(true); return groups.saveAndFlush(group);
    }
    private User actor(Role role) {
        User user = new User(); user.setEmail(UUID.randomUUID()+"@test.invalid"); user.setNom("Test"); user.setPrenom("Test");
        user.setMotDePasse("unused"); user.setRole(role); user.setActif(true); return users.saveAndFlush(user);
    }
}
