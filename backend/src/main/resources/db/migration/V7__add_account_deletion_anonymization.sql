ALTER TABLE utilisateurs
    ADD COLUMN deletion_requested_at DATETIME(6) NULL AFTER actif,
    ADD COLUMN anonymized_at DATETIME(6) NULL AFTER deletion_requested_at,
    MODIFY COLUMN mot_de_passe VARCHAR(255) NULL;

CREATE INDEX idx_utilisateurs_deletion_anonymization
    ON utilisateurs (deletion_requested_at, anonymized_at);
