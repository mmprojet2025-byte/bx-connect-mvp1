-- Additive preparation only: historical activities keep their values and NULL relations.
ALTER TABLE activites
    ADD COLUMN groupe_id BIGINT NULL,
    ADD COLUMN referent_assigne_id BIGINT NULL,
    ADD COLUMN image_storage_key VARCHAR(255) NULL,
    ADD INDEX idx_activites_groupe (groupe_id),
    ADD INDEX idx_activites_referent_assigne (referent_assigne_id),
    ADD CONSTRAINT fk_activites_groupe FOREIGN KEY (groupe_id)
        REFERENCES groupes (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT fk_activites_referent_assigne FOREIGN KEY (referent_assigne_id)
        REFERENCES utilisateurs (id) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- MEMBRES remains accepted for historical compatibility; no data is converted.
ALTER TABLE activites
    DROP CHECK chk_activites_visibilite,
    ADD CONSTRAINT chk_activites_visibilite
        CHECK (visibilite IN ('PUBLIC', 'MEMBRES', 'PRIVE_GROUPE'));
