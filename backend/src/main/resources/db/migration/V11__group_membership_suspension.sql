-- Preserve existing memberships; suspension never changes the user account.
ALTER TABLE membres_groupes
    MODIFY COLUMN statut ENUM('ACCEPTE','EN_ATTENTE','QUITTE','REFUSE','SUSPENDU') NOT NULL;
