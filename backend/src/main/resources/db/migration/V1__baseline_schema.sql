SET FOREIGN_KEY_CHECKS=0;




CREATE TABLE `activites` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `capacite_max` int NOT NULL,
  `categorie` varchar(100) DEFAULT NULL,
  `date_creation` datetime(6) NOT NULL,
  `date_debut` datetime(6) NOT NULL,
  `date_fin` datetime(6) NOT NULL,
  `description` text,
  `gratuite` bit(1) NOT NULL,
  `lieu` varchar(200) DEFAULT NULL,
  `prix` decimal(10,2) DEFAULT NULL,
  `statut` enum('ANNULEE','BROUILLON','PUBLIEE','TERMINEE') NOT NULL,
  `theme` varchar(100) DEFAULT NULL,
  `titre` varchar(150) NOT NULL,
  `createur_id` bigint NOT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `commune` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK5bsn6wf5t9nbrg3ds55wsfr1s` (`createur_id`),
  CONSTRAINT `FK5bsn6wf5t9nbrg3ds55wsfr1s` FOREIGN KEY (`createur_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `annonces` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `contenu` text NOT NULL,
  `date_creation` datetime(6) NOT NULL,
  `date_expiration` datetime(6) DEFAULT NULL,
  `epinglee` bit(1) NOT NULL,
  `titre` varchar(200) NOT NULL,
  `type` varchar(20) NOT NULL,
  `auteur_id` bigint NOT NULL,
  `groupe_id` bigint DEFAULT NULL,
  `categorie_opportunite` enum('APPEL_PROJET','EMPLOI','EVENEMENT','FORMATION','PUBLICITE','STAGE') DEFAULT NULL,
  `description_courte` varchar(300) DEFAULT NULL,
  `lien_externe` varchar(500) DEFAULT NULL,
  `statut_moderation` enum('EN_ATTENTE','PUBLIEE','REFUSEE') NOT NULL,
  `date_limite` datetime(6) DEFAULT NULL,
  `mise_en_avant` bit(1) NOT NULL,
  `mode_candidature` enum('CONTACT_PARTENAIRE','INFORMATION','LIEN_EXTERNE') DEFAULT NULL,
  `nombre_places` int DEFAULT NULL,
  `public_cible` enum('GROUPES','MEMBRES','PUBLIC','REFERENTS','TOUS') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKiw06duppdp9ujbxeuk292h261` (`auteur_id`),
  KEY `FKia5lwat8vbs2w21j5kl1fsvoc` (`groupe_id`),
  CONSTRAINT `FKia5lwat8vbs2w21j5kl1fsvoc` FOREIGN KEY (`groupe_id`) REFERENCES `groupes` (`id`),
  CONSTRAINT `FKiw06duppdp9ujbxeuk292h261` FOREIGN KEY (`auteur_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `acteur_email` varchar(100) NOT NULL,
  `acteur_role` varchar(30) NOT NULL,
  `action` varchar(80) NOT NULL,
  `cible_email` varchar(100) DEFAULT NULL,
  `cible_id` bigint DEFAULT NULL,
  `cible_type` varchar(50) NOT NULL,
  `date_action` datetime(6) NOT NULL,
  `details` varchar(500) DEFAULT NULL,
  `acteur_id` bigint DEFAULT NULL,
  `ancien_statut` varchar(80) DEFAULT NULL,
  `cible_nom` varchar(200) DEFAULT NULL,
  `metadata_json` text,
  `nouveau_statut` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `business_conversation_participants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `archived` bit(1) NOT NULL,
  `joined_at` datetime(6) NOT NULL,
  `last_read_at` datetime(6) DEFAULT NULL,
  `role_snapshot` enum('ADMIN','MEMBRE','PARTENAIRE','REFERENT','SUPER_ADMIN','VISITEUR') NOT NULL,
  `conversation_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_business_conversation_participant` (`conversation_id`,`user_id`),
  KEY `FKpokuyud1p2nlu6526g6ni8ydv` (`user_id`),
  CONSTRAINT `FK8lyigddf4vibi36ety12pcl9s` FOREIGN KEY (`conversation_id`) REFERENCES `business_conversations` (`id`),
  CONSTRAINT `FKpokuyud1p2nlu6526g6ni8ydv` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `business_conversations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `contexte_id` bigint DEFAULT NULL,
  `contexte_type` enum('AUCUN','GROUPE','PROJET','SOUTIEN') NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `last_message_at` datetime(6) DEFAULT NULL,
  `status` enum('ACTIVE','ARCHIVED') NOT NULL,
  `titre` varchar(180) NOT NULL,
  `type` enum('ADMIN_PARTENAIRE','ADMIN_REFERENT') NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `created_by_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKsiv3xgfl7kava4veh0ecxv7vm` (`created_by_id`),
  CONSTRAINT `FKsiv3xgfl7kava4veh0ecxv7vm` FOREIGN KEY (`created_by_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `business_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `contenu` text NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `system_message` bit(1) NOT NULL,
  `auteur_id` bigint NOT NULL,
  `conversation_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKphtci8tflwr1i3ohks5yt3qw0` (`auteur_id`),
  KEY `FKpyr0ljm7jid22h8dsrc6qf6qx` (`conversation_id`),
  CONSTRAINT `FKphtci8tflwr1i3ohks5yt3qw0` FOREIGN KEY (`auteur_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FKpyr0ljm7jid22h8dsrc6qf6qx` FOREIGN KEY (`conversation_id`) REFERENCES `business_conversations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `commentaires_projets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `contenu` text NOT NULL,
  `date_commentaire` datetime(6) NOT NULL,
  `auteur_id` bigint NOT NULL,
  `projet_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKqgn9oh0w458ubpicngmc1wfqb` (`auteur_id`),
  KEY `FK4k9pdp6p145sq5r9pg300dq0r` (`projet_id`),
  CONSTRAINT `FK4k9pdp6p145sq5r9pg300dq0r` FOREIGN KEY (`projet_id`) REFERENCES `projets` (`id`),
  CONSTRAINT `FKqgn9oh0w458ubpicngmc1wfqb` FOREIGN KEY (`auteur_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `fils_discussion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `actif` bit(1) NOT NULL,
  `date_creation` datetime(6) NOT NULL,
  `description` text,
  `titre` varchar(150) NOT NULL,
  `type` enum('ADMIN','EVENEMENT','GENERAL','PROJET') NOT NULL,
  `createur_id` bigint NOT NULL,
  `groupe_id` bigint DEFAULT NULL,
  `projet_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK2drgi3kthcgxebh3d53tbunim` (`createur_id`),
  KEY `FKik85tho4vydrm65sadvqs7pcl` (`groupe_id`),
  KEY `FK22st52ifdscuwx1hljek865j8` (`projet_id`),
  CONSTRAINT `FK22st52ifdscuwx1hljek865j8` FOREIGN KEY (`projet_id`) REFERENCES `projets` (`id`),
  CONSTRAINT `FK2drgi3kthcgxebh3d53tbunim` FOREIGN KEY (`createur_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FKik85tho4vydrm65sadvqs7pcl` FOREIGN KEY (`groupe_id`) REFERENCES `groupes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `groupes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `actif` bit(1) NOT NULL,
  `capacite_max` int NOT NULL,
  `categorie` varchar(100) DEFAULT NULL,
  `date_creation` datetime(6) NOT NULL,
  `date_validation` datetime(6) DEFAULT NULL,
  `description` text,
  `motif_refus` text,
  `nom` varchar(100) NOT NULL,
  `objectif` text,
  `statut` enum('ARCHIVE','EN_ATTENTE','REFUSE','VALIDE') NOT NULL,
  `theme` varchar(100) DEFAULT NULL,
  `referent_id` bigint NOT NULL,
  `adresse_reunion` varchar(255) DEFAULT NULL,
  `commune` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKr9496u0ef3rjrwx8hnvls4uk8` (`referent_id`),
  CONSTRAINT `FKr9496u0ef3rjrwx8hnvls4uk8` FOREIGN KEY (`referent_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `inscriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date_annulation` datetime(6) DEFAULT NULL,
  `date_inscription` datetime(6) NOT NULL,
  `statut` enum('ANNULEE','CONFIRMEE','EN_ATTENTE_PAIEMENT','PAYEE') NOT NULL,
  `activite_id` bigint NOT NULL,
  `membre_id` bigint NOT NULL,
  `commentaire_presence` text,
  `date_presence` datetime(6) DEFAULT NULL,
  `date_validation_presence` datetime(6) DEFAULT NULL,
  `statut_presence` varchar(30) NOT NULL DEFAULT 'NON_RENSEIGNEE',
  `presence_encodee_par_id` bigint DEFAULT NULL,
  `presence_validee_par_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKadvy3r8bp7pxgw6v58o7xiw96` (`membre_id`,`activite_id`),
  KEY `FKgrbabhduvo3fkjl945o4v013g` (`activite_id`),
  KEY `FK4pb836glw1cd8qg7c62pr5xd5` (`presence_encodee_par_id`),
  KEY `FK2ms44fsx102l4kppxqmqma5g` (`presence_validee_par_id`),
  CONSTRAINT `FK2ms44fsx102l4kppxqmqma5g` FOREIGN KEY (`presence_validee_par_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FK4pb836glw1cd8qg7c62pr5xd5` FOREIGN KEY (`presence_encodee_par_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FK5yrrnej3tjsnydrk1sb6kp9ml` FOREIGN KEY (`membre_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FKgrbabhduvo3fkjl945o4v013g` FOREIGN KEY (`activite_id`) REFERENCES `activites` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `membres_groupes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date_adhesion` datetime(6) NOT NULL,
  `statut` enum('ACCEPTE','EN_ATTENTE','QUITTE','REFUSE') NOT NULL,
  `groupe_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKhojfwvkn0x6i6gjwqwpu5cid4` (`user_id`,`groupe_id`),
  KEY `FKfokg90koqjhkdnap5tti9d59d` (`groupe_id`),
  CONSTRAINT `FKfokg90koqjhkdnap5tti9d59d` FOREIGN KEY (`groupe_id`) REFERENCES `groupes` (`id`),
  CONSTRAINT `FKpnkys7yemsuyml8wjm6qyrbn` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `contenu` text NOT NULL,
  `date_envoi` datetime(6) NOT NULL,
  `lu` bit(1) NOT NULL,
  `auteur_id` bigint NOT NULL,
  `fil_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKrlet4om3k4edcp3o315waauxp` (`auteur_id`),
  KEY `FKc052q5xbtjkadq9ghr2vmx238` (`fil_id`),
  CONSTRAINT `FKc052q5xbtjkadq9ghr2vmx238` FOREIGN KEY (`fil_id`) REFERENCES `fils_discussion` (`id`),
  CONSTRAINT `FKrlet4om3k4edcp3o315waauxp` FOREIGN KEY (`auteur_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date_creation` datetime(6) NOT NULL,
  `lien_action` varchar(200) DEFAULT NULL,
  `lue` bit(1) NOT NULL,
  `message` text NOT NULL,
  `titre` varchar(200) NOT NULL,
  `type` varchar(50) NOT NULL,
  `destinataire_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKcb698onmh4p6jeh7eplp9vv02` (`destinataire_id`),
  CONSTRAINT `FKcb698onmh4p6jeh7eplp9vv02` FOREIGN KEY (`destinataire_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `partenaire_groupe` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `commentaire` varchar(500) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `date_debut` datetime(6) NOT NULL,
  `date_fin` datetime(6) DEFAULT NULL,
  `statut` enum('ACTIF','INACTIF') NOT NULL,
  `type_lien` enum('AUTRE','EMPLOI','FORMATION','LOGISTIQUE','MENTORAT','SOUTIEN') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `groupe_id` bigint NOT NULL,
  `partenaire_profil_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKrm4e5gqg14ffav9pmoy7mhmaq` (`created_by_id`),
  KEY `FK3t3w0uitpf9kwb5e0b0oxn33d` (`groupe_id`),
  KEY `FK9u6s7rvsyqiybgtgj3wiap9wd` (`partenaire_profil_id`),
  CONSTRAINT `FK3t3w0uitpf9kwb5e0b0oxn33d` FOREIGN KEY (`groupe_id`) REFERENCES `groupes` (`id`),
  CONSTRAINT `FK9u6s7rvsyqiybgtgj3wiap9wd` FOREIGN KEY (`partenaire_profil_id`) REFERENCES `partenaire_profils` (`id`),
  CONSTRAINT `FKrm4e5gqg14ffav9pmoy7mhmaq` FOREIGN KEY (`created_by_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `partenaire_profils` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date_creation` datetime(6) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `email_contact` varchar(150) DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `nom_organisation` varchar(150) NOT NULL,
  `personne_contact` varchar(120) DEFAULT NULL,
  `site_web` varchar(300) DEFAULT NULL,
  `telephone` varchar(40) DEFAULT NULL,
  `type_partenaire` enum('ASSOCIATION','AUTRE','BIJ','COMMUNE','ECOLE','ENTREPRISE','FONDATION','HAUTE_ECOLE','ONG','SPONSOR') NOT NULL,
  `utilisateur_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKbswtpmirab4hqypg6sxtmtvca` (`utilisateur_id`),
  CONSTRAINT `FKa4swfksw15mdb08qgnhnki9nf` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `partenaire_referent` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `commentaire` varchar(500) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `date_debut` datetime(6) NOT NULL,
  `date_fin` datetime(6) DEFAULT NULL,
  `statut` enum('ACTIF','INACTIF') NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `created_by_id` bigint DEFAULT NULL,
  `partenaire_profil_id` bigint NOT NULL,
  `referent_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKllvklpbd26sgsrwax0rca3nbc` (`created_by_id`),
  KEY `FKqir0njkub22sb9f20obs5q87x` (`partenaire_profil_id`),
  KEY `FKf6p64w5onf64mu9n8l32260da` (`referent_id`),
  CONSTRAINT `FKf6p64w5onf64mu9n8l32260da` FOREIGN KEY (`referent_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FKllvklpbd26sgsrwax0rca3nbc` FOREIGN KEY (`created_by_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FKqir0njkub22sb9f20obs5q87x` FOREIGN KEY (`partenaire_profil_id`) REFERENCES `partenaire_profils` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `participations_projets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date_participation` datetime(6) NOT NULL,
  `role_projet` varchar(200) DEFAULT NULL,
  `projet_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK3w5q6jaferyrblbh1c3fvu1uu` (`user_id`,`projet_id`),
  KEY `FKss2qvqgm3ybjw13jp7re2bers` (`projet_id`),
  CONSTRAINT `FKeq5jeb55yd8eg100nl8r0hded` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FKss2qvqgm3ybjw13jp7re2bers` FOREIGN KEY (`projet_id`) REFERENCES `projets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `prestations_benevoles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `commentaire_referent` text,
  `date_creation` datetime(6) NOT NULL,
  `date_prestation` date NOT NULL,
  `date_validation` datetime(6) DEFAULT NULL,
  `description` text,
  `duree_heures` double NOT NULL,
  `statut` enum('EN_ATTENTE','REFUSEE','VALIDEE') NOT NULL,
  `titre` varchar(150) NOT NULL,
  `type` varchar(50) NOT NULL,
  `groupe_id` bigint NOT NULL,
  `membre_id` bigint NOT NULL,
  `referent_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKj6xma0octsayrkdqkb4cp7kyr` (`groupe_id`),
  KEY `FKq75svywcpe5l86i54vdqu02cl` (`membre_id`),
  KEY `FKl5ql0671snnult7v04ywqo5dw` (`referent_id`),
  CONSTRAINT `FKj6xma0octsayrkdqkb4cp7kyr` FOREIGN KEY (`groupe_id`) REFERENCES `groupes` (`id`),
  CONSTRAINT `FKl5ql0671snnult7v04ywqo5dw` FOREIGN KEY (`referent_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FKq75svywcpe5l86i54vdqu02cl` FOREIGN KEY (`membre_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `projets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `budget_demande` decimal(10,2) DEFAULT NULL,
  `commentaire_admin` varchar(500) DEFAULT NULL,
  `date_cloture` datetime(6) DEFAULT NULL,
  `date_creation` datetime(6) NOT NULL,
  `date_soumission` datetime(6) DEFAULT NULL,
  `date_validation` datetime(6) DEFAULT NULL,
  `description` text,
  `objectifs` text,
  `statut` enum('APPROUVE','ARCHIVE','BROUILLON','EN_COURS','REJETE','SOUMIS','TERMINE') NOT NULL,
  `titre` varchar(150) NOT NULL,
  `groupe_id` bigint DEFAULT NULL,
  `porteur_id` bigint NOT NULL,
  `visibilite` varchar(20) NOT NULL DEFAULT 'GROUPE',
  `commentaire_referent` varchar(500) DEFAULT NULL,
  `date_refus_referent` datetime(6) DEFAULT NULL,
  `date_validation_referent` datetime(6) DEFAULT NULL,
  `referent_validateur_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK3bp5uaernernmmki2c5gevecy` (`groupe_id`),
  KEY `FKd49ix5jcd7t5tg46ovnhqfn8d` (`porteur_id`),
  KEY `FKpp70tbmjfnfodermax1uv4bmm` (`referent_validateur_id`),
  CONSTRAINT `FK3bp5uaernernmmki2c5gevecy` FOREIGN KEY (`groupe_id`) REFERENCES `groupes` (`id`),
  CONSTRAINT `FKd49ix5jcd7t5tg46ovnhqfn8d` FOREIGN KEY (`porteur_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FKpp70tbmjfnfodermax1uv4bmm` FOREIGN KEY (`referent_validateur_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `push_devices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `device_id` varchar(255) DEFAULT NULL,
  `enabled` bit(1) NOT NULL,
  `expo_push_token` varchar(255) NOT NULL,
  `platform` varchar(20) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` bigint NOT NULL,
  `last_error` varchar(500) DEFAULT NULL,
  `last_error_at` datetime(6) DEFAULT NULL,
  `last_sent_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_push_device_expo_token` (`expo_push_token`),
  KEY `FKnjd2jegvwmsgmlkvrlckvutcq` (`user_id`),
  CONSTRAINT `FKnjd2jegvwmsgmlkvrlckvutcq` FOREIGN KEY (`user_id`) REFERENCES `utilisateurs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `soutiens_financiers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `approval_url` varchar(500) DEFAULT NULL,
  `checkout_url` varchar(500) DEFAULT NULL,
  `date_creation` datetime(6) NOT NULL,
  `date_paiement` datetime(6) DEFAULT NULL,
  `fournisseur` varchar(20) DEFAULT NULL,
  `message` text,
  `montant` decimal(10,2) NOT NULL,
  `paypal_payer_id` varchar(100) DEFAULT NULL,
  `paypal_payment_id` varchar(100) DEFAULT NULL,
  `statut_paiement` enum('ANNULE','ECHOUE','EN_ATTENTE','PAYE','REMBOURSE') NOT NULL,
  `stripe_payment_intent_id` varchar(200) DEFAULT NULL,
  `stripe_session_id` varchar(200) DEFAULT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `type_source` varchar(50) DEFAULT NULL,
  `activite_id` bigint DEFAULT NULL,
  `donateur_id` bigint NOT NULL,
  `projet_id` bigint DEFAULT NULL,
  `date_reponse_admin` datetime(6) DEFAULT NULL,
  `reponse_admin` text,
  PRIMARY KEY (`id`),
  KEY `FKj3gncxhjn7nyb3gh6atqm3iic` (`activite_id`),
  KEY `FKaocnbs9j27fkdccxbdguy6pya` (`donateur_id`),
  KEY `FK3imhskguiv9outuf06woty4fs` (`projet_id`),
  CONSTRAINT `FK3imhskguiv9outuf06woty4fs` FOREIGN KEY (`projet_id`) REFERENCES `projets` (`id`),
  CONSTRAINT `FKaocnbs9j27fkdccxbdguy6pya` FOREIGN KEY (`donateur_id`) REFERENCES `utilisateurs` (`id`),
  CONSTRAINT `FKj3gncxhjn7nyb3gh6atqm3iic` FOREIGN KEY (`activite_id`) REFERENCES `activites` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `utilisateurs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `actif` bit(1) NOT NULL,
  `date_inscription` datetime(6) NOT NULL,
  `email` varchar(100) NOT NULL,
  `langue_preference` enum('EN','FR','NL') NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `role` enum('ADMIN','MEMBRE','PARTENAIRE','REFERENT','SUPER_ADMIN','VISITEUR') NOT NULL,
  `auth_provider` enum('LOCAL') DEFAULT NULL,
  `legal_version` varchar(40) DEFAULT NULL,
  `privacy_accepted` tinyint(1) NOT NULL DEFAULT '0',
  `privacy_accepted_at` datetime(6) DEFAULT NULL,
  `terms_accepted` tinyint(1) NOT NULL DEFAULT '0',
  `terms_accepted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK6ldvumu3hqvnmmxy1b6lsxwqy` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




SET FOREIGN_KEY_CHECKS=1;
