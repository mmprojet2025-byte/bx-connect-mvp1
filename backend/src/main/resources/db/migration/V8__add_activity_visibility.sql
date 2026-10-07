ALTER TABLE activites
    ADD COLUMN visibilite VARCHAR(20) NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE activites
    ADD CONSTRAINT chk_activites_visibilite CHECK (visibilite IN ('PUBLIC', 'MEMBRES'));
