CREATE INDEX idx_utilisateurs_role_actif
ON utilisateurs (role, actif);

CREATE INDEX idx_groupes_statut_date_creation
ON groupes (statut, date_creation);

CREATE INDEX idx_groupes_referent_statut
ON groupes (referent_id, statut);

CREATE INDEX idx_activites_statut_date_debut
ON activites (statut, date_debut);

CREATE INDEX idx_activites_createur_statut
ON activites (createur_id, statut);

CREATE INDEX idx_inscriptions_activite_statut
ON inscriptions (activite_id, statut);

CREATE INDEX idx_membres_groupes_groupe_statut
ON membres_groupes (groupe_id, statut);

CREATE INDEX idx_membres_groupes_user_statut
ON membres_groupes (user_id, statut);

CREATE INDEX idx_projets_statut_visibilite
ON projets (statut, visibilite);

CREATE INDEX idx_notifications_dest_lue_date
ON notifications (destinataire_id, lue, date_creation);

CREATE INDEX idx_messages_fil_date
ON messages (fil_id, date_envoi);

CREATE INDEX idx_business_messages_conversation_created
ON business_messages (conversation_id, created_at);

CREATE INDEX idx_soutiens_donateur_statut
ON soutiens_financiers (donateur_id, statut_paiement);

CREATE INDEX idx_soutiens_projet_statut
ON soutiens_financiers (projet_id, statut_paiement);

CREATE INDEX idx_soutiens_activite_statut
ON soutiens_financiers (activite_id, statut_paiement);

CREATE INDEX idx_audit_logs_date_action
ON audit_logs (date_action);
