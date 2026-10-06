-- Keep existing projects and workflow; consolidate legacy audiences into Public.
UPDATE projets SET visibilite = 'PUBLIC' WHERE visibilite IN ('COMMUNAUTE', 'PARTENAIRES');
