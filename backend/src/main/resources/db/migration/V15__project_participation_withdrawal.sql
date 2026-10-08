-- Preserve existing participations and payments; NULL keeps all current participations active.
ALTER TABLE participations_projets ADD COLUMN date_retrait DATETIME(6) NULL;
