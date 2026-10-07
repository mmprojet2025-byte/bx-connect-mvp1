ALTER TABLE projets
    ADD COLUMN capacite INT NULL,
    ADD COLUMN date_execution DATE NULL,
    ADD COLUMN date_limite_participation DATE NULL,
    ADD COLUMN image_url VARCHAR(500) NULL;
