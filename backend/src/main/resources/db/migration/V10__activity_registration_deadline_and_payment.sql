ALTER TABLE activites ADD COLUMN date_limite_inscription DATETIME(6) NULL;
ALTER TABLE soutiens_financiers ADD COLUMN inscription_id BIGINT NULL,
 ADD CONSTRAINT fk_activity_payment_registration FOREIGN KEY (inscription_id) REFERENCES inscriptions(id);
CREATE INDEX idx_activity_payment_registration ON soutiens_financiers(inscription_id);
ALTER TABLE soutiens_financiers
 ADD COLUMN activity_request_key VARCHAR(36) NULL,
 ADD COLUMN checkout_expires_at BIGINT NULL,
 ADD CONSTRAINT uk_activity_request_key UNIQUE (activity_request_key);
