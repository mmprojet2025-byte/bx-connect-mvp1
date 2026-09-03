ALTER TABLE projets
    MODIFY COLUMN statut ENUM(
        'BROUILLON',
        'SOUMIS',
        'A_CORRIGER_REFERENT',
        'VALIDE_REFERENT',
        'A_CORRIGER_ADMIN',
        'REFUSE_REFERENT',
        'APPROUVE',
        'EN_COURS',
        'TERMINE',
        'REJETE',
        'ANNULE',
        'ARCHIVE'
    ) NOT NULL,
    ADD COLUMN justification_admin VARCHAR(500) NULL,
    ADD COLUMN bilan TEXT NULL,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
