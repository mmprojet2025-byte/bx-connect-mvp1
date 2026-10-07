ALTER TABLE projets ADD COLUMN prix_participation DECIMAL(10,2) NOT NULL DEFAULT 0.00;
CREATE TABLE paiements_participations_projets (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    projet_id BIGINT NOT NULL,
    membre_id BIGINT NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    devise VARCHAR(3) NOT NULL,
    statut VARCHAR(20) NOT NULL,
    request_key VARCHAR(36) NOT NULL UNIQUE,
    stripe_session_id VARCHAR(200) UNIQUE,
    stripe_payment_intent_id VARCHAR(200) UNIQUE,
    checkout_url VARCHAR(500),
    expires_at BIGINT NOT NULL,
    date_creation DATETIME(6) NOT NULL,
    date_paiement DATETIME(6),
    numero_recu VARCHAR(50) UNIQUE,
    titre_projet VARCHAR(150) NOT NULL,
    nom_participant VARCHAR(150) NOT NULL,
    INDEX idx_project_payment_member (membre_id, date_creation),
    INDEX idx_project_payment_project (projet_id, date_creation),
    CONSTRAINT fk_project_payment_project FOREIGN KEY (projet_id) REFERENCES projets(id),
    CONSTRAINT fk_project_payment_member FOREIGN KEY (membre_id) REFERENCES utilisateurs(id)
);
