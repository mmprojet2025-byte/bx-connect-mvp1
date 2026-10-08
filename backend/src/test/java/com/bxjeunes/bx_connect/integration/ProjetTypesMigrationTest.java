package com.bxjeunes.bx_connect.integration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class ProjetTypesMigrationTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("project_types_test").withUsername("test").withPassword("disposable_test");

    @Test void migrationConvertsOnlyLegacyTypesAndPreservesParticipationAndWorkflow() throws Exception {
        Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())
                .target("11").load().migrate();
        try (var connection = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
             var statement = connection.createStatement()) {
            statement.executeUpdate("""
                INSERT INTO utilisateurs (id,actif,date_inscription,email,langue_preference,mot_de_passe,nom,prenom,role)
                VALUES (1,1,NOW(),'fixture@example.org','FR','not-a-login-hash','Test','Test','MEMBRE')
                """);
            for (String type : new String[]{"GROUPE", "PUBLIC", "COMMUNAUTE", "PARTENAIRES"}) {
                try (var insert = connection.prepareStatement(
                        "INSERT INTO projets (titre,date_creation,statut,porteur_id,visibilite) VALUES (?,NOW(),'BROUILLON',1,?)")) {
                    insert.setString(1, type); insert.setString(2, type); insert.executeUpdate();
                }
            }
            statement.executeUpdate("INSERT INTO participations_projets (user_id,projet_id,date_participation) VALUES (1,3,NOW())");
        }
        var flyway = Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword()).target("12").load();
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        var paymentsMigration = Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword()).target("13").load();
        assertThat(paymentsMigration.migrate().migrationsExecuted).isEqualTo(1);
        var detailsMigration = Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword()).target("14").load();
        assertThat(detailsMigration.migrate().migrationsExecuted).isEqualTo(1);
        assertThat(detailsMigration.migrate().migrationsExecuted).isZero();
        var withdrawalMigration = Flyway.configure().dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword()).target("15").load();
        assertThat(withdrawalMigration.migrate().migrationsExecuted).isEqualTo(1);
        assertThat(withdrawalMigration.migrate().migrationsExecuted).isZero();
        try (var connection = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
             var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT id,titre,visibilite,statut,prix_participation,capacite,date_execution,date_limite_participation,image_url FROM projets ORDER BY id")) {
            int count = 0;
            while (rows.next()) {
                count++;
                for (String column : new String[]{"capacite", "date_execution", "date_limite_participation", "image_url"}) assertThat(rows.getObject(column)).isNull();
                assertThat(rows.getInt("id")).isEqualTo(count);
                assertThat(rows.getString("visibilite")).isEqualTo(count == 1 ? "GROUPE" : "PUBLIC");
                assertThat(rows.getString("statut")).isEqualTo("BROUILLON");
                assertThat(rows.getBigDecimal("prix_participation")).isEqualByComparingTo("0.00");
            }
            assertThat(count).isEqualTo(4);
            try (var participation = statement.executeQuery("SELECT user_id,projet_id,date_participation,date_retrait FROM participations_projets")) {
                assertThat(participation.next()).isTrue();
                assertThat(participation.getInt("user_id")).isEqualTo(1);
                assertThat(participation.getInt("projet_id")).isEqualTo(3);
                assertThat(participation.getTimestamp("date_participation")).isNotNull();
                assertThat(participation.getObject("date_retrait")).isNull();
                assertThat(participation.next()).isFalse();
            }
        }
    }
}
