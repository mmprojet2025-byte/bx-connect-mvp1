package com.bxjeunes.bx_connect.service;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class AccountDeletionMigrationTest {

    @Test
    void v7_declares_deletion_and_anonymization_dates_without_rewriting_previous_migrations() throws Exception {
        Path migration = Path.of("src/main/resources/db/migration/V7__add_account_deletion_anonymization.sql");
        String sql = Files.readString(migration);

        assertThat(sql).contains("deletion_requested_at", "anonymized_at", "mot_de_passe VARCHAR(255) NULL");
        assertThat(Files.list(migration.getParent()).map(path -> path.getFileName().toString())
                .filter(name -> name.startsWith("V7__")).toList())
                .containsExactly("V7__add_account_deletion_anonymization.sql");
    }
}
