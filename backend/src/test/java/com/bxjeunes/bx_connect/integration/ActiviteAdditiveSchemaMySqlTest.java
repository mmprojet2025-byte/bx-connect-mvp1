package com.bxjeunes.bx_connect.integration;

import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.entity.VisibiliteActivite;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/** Runs only against disposable MySQL. Fixtures deliberately preserve inconsistent history. */
@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Testcontainers
class ActiviteAdditiveSchemaMySqlTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("activity_schema_test")
            .withUsername("test").withPassword("disposable_test");

    private static String historicalColumns;
    private static List<Map<String, Object>> historicalActivities;
    private static List<Map<String, Object>> historicalRegistrations;
    private static List<Map<String, Object>> historicalSupports;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())
                .target("8").load().migrate();
        JdbcTemplate before = new JdbcTemplate(new DriverManagerDataSource(
                mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword()));
        before.update("""
                INSERT INTO utilisateurs (id, actif, date_inscription, email, langue_preference, nom, prenom, role)
                VALUES (1,1,'2026-01-01','admin@test.invalid','FR','Test','Admin','ADMIN'),
                       (2,1,'2026-01-01','referent@test.invalid','FR','Test','Referent','REFERENT'),
                       (3,1,'2026-01-01','member@test.invalid','FR','Test','Member','MEMBRE'),
                       (4,1,'2026-01-01','assigned@test.invalid','FR','Test','Assigned','REFERENT')
                """);
        before.update("""
                INSERT INTO groupes (id,actif,capacite_max,date_creation,nom,statut,referent_id)
                VALUES (1,1,10,'2026-01-01','Groupe test','VALIDE',2)
                """);
        before.update("""
                INSERT INTO activites (id,titre,description,lieu,capacite_max,date_creation,date_debut,date_fin,
                                       gratuite,prix,statut,visibilite,createur_id)
                VALUES (1,'Historique annule','Description','Bruxelles',10,'2026-10-04',
                        '2026-10-14 16:41:00','2026-10-14 17:41:00',1,NULL,'ANNULEE','PUBLIC',2),
                       (2,'Historique payant',NULL,NULL,0,'2026-01-01',
                        '2026-02-01','2026-02-01',0,12.50,'TERMINEE','MEMBRES',1)
                """);
        before.update("""
                INSERT INTO inscriptions (id,activite_id,membre_id,statut,date_inscription,statut_presence,
                                          date_presence,date_validation_presence,presence_encodee_par_id,
                                          presence_validee_par_id,commentaire_presence)
                VALUES (1,1,3,'CONFIRMEE','2026-10-04','PRESENT','2026-10-04 19:33:00',
                        '2026-10-04 19:33:08',2,2,'Historique conserve')
                """);
        before.update("""
                INSERT INTO soutiens_financiers (id,activite_id,donateur_id,montant,statut_paiement,date_creation)
                VALUES (1,2,3,12.50,'PAYE','2026-01-01')
                """);
        historicalColumns = String.join(",", before.queryForList("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema=DATABASE() AND table_name='activites' ORDER BY ordinal_position
                """, String.class));
        historicalActivities = before.queryForList("SELECT " + historicalColumns + " FROM activites ORDER BY id");
        historicalRegistrations = before.queryForList("SELECT * FROM inscriptions ORDER BY id");
        historicalSupports = before.queryForList("SELECT * FROM soutiens_financiers ORDER BY id");

        // Spring applies V9 after the V8 snapshots, then Hibernate validates the full mapping.
        properties.add("spring.datasource.url", mysql::getJdbcUrl);
        properties.add("spring.datasource.username", mysql::getUsername);
        properties.add("spring.datasource.password", mysql::getPassword);
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        properties.add("spring.flyway.enabled", () -> "true");
        properties.add("spring.flyway.baseline-on-migrate", () -> "false");
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entityManager;

    @Test
    void migratesV8WithoutChangingAnyHistoricalColumnOrDependentRow() {
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version='9' AND success=1", Integer.class))
                .isEqualTo(1);
        assertThat(jdbc.queryForList("SELECT " + historicalColumns + " FROM activites ORDER BY id"))
                .isEqualTo(historicalActivities);
        assertThat(jdbc.queryForList("SELECT * FROM inscriptions ORDER BY id")).isEqualTo(historicalRegistrations);
        assertThat(jdbc.queryForList("SELECT * FROM soutiens_financiers ORDER BY id")).isEqualTo(historicalSupports);
    }

    @Test
    void newColumnsAreNullableAndHistoricalRelationsRemainNull() {
        assertThat(jdbc.queryForList("""
                SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='activites' AND is_nullable='YES'
                AND column_name IN ('groupe_id','referent_assigne_id','image_storage_key')
                """, String.class)).containsExactlyInAnyOrder("groupe_id", "referent_assigne_id", "image_storage_key");
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM activites WHERE groupe_id IS NULL
                AND referent_assigne_id IS NULL AND image_storage_key IS NULL
                """, Integer.class)).isEqualTo(2);
        for (long id : new long[]{1, 2}) {
            Activite activity = entityManager.find(Activite.class, id);
            assertThat(activity.getGroupe()).isNull();
            assertThat(activity.getReferentAssigne()).isNull();
            assertThat(activity.getImageStorageKey()).isNull();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"groupe_id", "referent_assigne_id"})
    void foreignKeysRejectUnknownIdentifiers(String column) {
        assertThatThrownBy(() -> jdbc.update("UPDATE activites SET " + column + "=999999 WHERE id=1"))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("foreign key constraint fails");
    }

    @Test
    void explicitIndexesAndRestrictiveForeignKeysExist() {
        assertThat(jdbc.queryForList("""
                SELECT CONCAT(index_name, ':', column_name) FROM information_schema.statistics
                WHERE table_schema=DATABASE() AND table_name='activites'
                AND index_name IN ('idx_activites_groupe','idx_activites_referent_assigne')
                """, String.class)).containsExactlyInAnyOrder(
                "idx_activites_groupe:groupe_id", "idx_activites_referent_assigne:referent_assigne_id");
        assertThat(jdbc.queryForList("""
                SELECT CONCAT(constraint_name, ':', referenced_table_name, ':', delete_rule, ':', update_rule)
                FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE()
                AND table_name='activites'
                AND constraint_name IN ('fk_activites_groupe','fk_activites_referent_assigne')
                """, String.class)).containsExactlyInAnyOrder(
                "fk_activites_groupe:groupes:RESTRICT:RESTRICT",
                "fk_activites_referent_assigne:utilisateurs:RESTRICT:RESTRICT");
    }

    @ParameterizedTest
    @ValueSource(strings = {"groupes", "utilisateurs"})
    void deletingReferencedParentsCannotCascadeToActivities(String table) {
        jdbc.update("UPDATE activites SET groupe_id=1, referent_assigne_id=4 WHERE id=1");
        long id = table.equals("groupes") ? 1 : 4;
        assertThatThrownBy(() -> jdbc.update("DELETE FROM " + table + " WHERE id=?", id))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("foreign key constraint fails");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM activites", Integer.class)).isEqualTo(2);
    }

    @ParameterizedTest
    @EnumSource(VisibiliteActivite.class)
    void allThreeVisibilitiesRoundTripThroughJpa(VisibiliteActivite visibility) {
        assertThat(VisibiliteActivite.values()).containsExactlyInAnyOrder(
                VisibiliteActivite.PUBLIC, VisibiliteActivite.MEMBRES, VisibiliteActivite.PRIVE_GROUPE);
        Activite activity = entityManager.find(Activite.class, 2L);
        activity.setVisibilite(visibility);
        entityManager.flush();
        entityManager.clear();
        assertThat(entityManager.find(Activite.class, 2L).getVisibilite()).isEqualTo(visibility);
    }

    @Test
    void unknownVisibilityAndNullVisibilityAreRejected() {
        assertThatThrownBy(() -> jdbc.update("UPDATE activites SET visibilite='INCONNUE' WHERE id=1"))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("chk_activites_visibilite");
        assertThatThrownBy(() -> jdbc.update("UPDATE activites SET visibilite=NULL WHERE id=1"))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void associationsAndInternalImageKeyRoundTripWithoutReplacingCreator() {
        Activite activity = entityManager.find(Activite.class, 2L);
        activity.setGroupe(entityManager.getReference(Groupe.class, 1L));
        activity.setReferentAssigne(entityManager.getReference(User.class, 2L));
        activity.setImageStorageKey("activites/test-cover.webp");
        entityManager.flush();
        entityManager.clear();
        Activite saved = entityManager.find(Activite.class, 2L);
        assertThat(saved.getCreateur().getId()).isEqualTo(1L);
        assertThat(saved.getGroupe().getId()).isEqualTo(1L);
        assertThat(saved.getReferentAssigne().getId()).isEqualTo(2L);
        assertThat(saved.getImageStorageKey()).isEqualTo("activites/test-cover.webp");
        saved.setGroupe(null);
        saved.setReferentAssigne(null);
        saved.setImageStorageKey(null);
        entityManager.flush();
        entityManager.clear();
        assertThat(entityManager.find(Activite.class, 2L).getGroupe()).isNull();
        assertThat(entityManager.find(Activite.class, 2L).getReferentAssigne()).isNull();
        assertThat(entityManager.find(Activite.class, 2L).getImageStorageKey()).isNull();
    }
}
