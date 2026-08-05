# BX-Connect - Production runbook

Ce runbook decrit les points d'exploitation minimum pour BX-Connect en
production reelle. Il doit etre complete avec les choix definitifs
d'hebergement avant l'ouverture aux utilisateurs.

## Architecture

- Backend : application Spring Boot dans `backend/`.
- Frontend web : application Vite/React dans `frontend-web/`.
- Mobile : application Expo/React Native dans `mobile/`.
- Base de donnees : MySQL, schema gere par Flyway.
- Paiements : Stripe et PayPal selon les variables de production.
- Fichiers publics : uploads servis par le backend via `/uploads/**`.

## Prerequis production

- Domaine HTTPS pour le frontend web.
- Domaine HTTPS pour l'API backend.
- MySQL gere ou serveur MySQL durci.
- Stockage de secrets hors Git.
- Sauvegardes MySQL automatisees et chiffrees.
- Monitoring et alertes actifs.
- Procedure de restauration testee.
- Compte administrateur initial gere de maniere controlee.

## Profils Spring attendus

En production, le backend doit demarrer avec :

```text
SPRING_PROFILES_ACTIVE=prod
BX_PRODUCTION=true
```

Le profil `prod` active les garde-fous suivants :

- configuration datasource via variables d'environnement ;
- secrets obligatoires ;
- URLs HTTPS non locales ;
- CORS explicite ;
- Swagger desactive ;
- Flyway actif ;
- Hibernate en `ddl-auto=validate`.

## Variables d'environnement obligatoires

Voir [PRODUCTION_ENV_CHECKLIST.md](./PRODUCTION_ENV_CHECKLIST.md).

Variables backend minimales :

- `SPRING_PROFILES_ACTIVE`
- `BX_PRODUCTION`
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `APP_CORS_ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `PASSWORD_RESET_EMAIL_ENABLED`
- `PASSWORD_RESET_TOKEN_TTL`
- `PASSWORD_RESET_FRONTEND_URL`
- `PASSWORD_RESET_FROM_ADDRESS`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- variables Stripe si Stripe est active ;
- variables PayPal si PayPal est actif.

Variables frontend/mobile :

- `VITE_API_BASE_URL`
- `EXPO_PUBLIC_API_BASE_URL`
- Sentry/analytics si utilises.

## Ordre de demarrage

1. Verifier que la base MySQL est disponible.
2. Verifier que les variables d'environnement de production sont chargees.
3. Demarrer le backend avec `SPRING_PROFILES_ACTIVE=prod` et
   `BX_PRODUCTION=true`.
4. Laisser Flyway valider/appliquer les migrations.
5. Verifier le healthcheck backend.
6. Servir le frontend web build avec `VITE_API_BASE_URL` production.
7. Verifier les flows critiques.

## Flyway

Flyway est la source de verite du schema.

- `V1__baseline_schema.sql` : schema initial.
- `V2__add_core_indexes.sql` : index de base.
- Evolutions futures : `V3__...`, `V4__...`, etc.

Ne jamais utiliser `spring.jpa.hibernate.ddl-auto=update` en production.
Ne jamais modifier une migration deja appliquee. Voir
[backend/src/main/resources/db/migration/README.md](./backend/src/main/resources/db/migration/README.md).

## Healthcheck

Endpoint minimal :

```text
GET /actuator/health
```

Le resultat attendu est HTTP `200` avec un statut applicatif sain. Le chemin
exact public dependra du domaine API choisi.

## Verifications apres demarrage

- `/actuator/health` repond `200`.
- Le backend indique le profil `prod`.
- Flyway indique un schema a jour.
- Swagger n'est pas accessible en production.
- Le frontend appelle bien l'API HTTPS de production.
- Login admin fonctionne.
- Dashboards principaux chargent.
- Notifications se chargent.
- Paiement test controle ou webhook de validation selon l'environnement.
- Upload image controle.
- Logs sans secret visible.

## Contacts et responsabilites

A completer avant production :

- Responsable technique :
- Responsable association :
- Responsable incident paiement :
- Responsable sauvegarde/restauration :
- Contact hebergeur :
- Contact Stripe :
- Contact PayPal :

## Documents lies

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)
- [PRODUCTION_ENV_CHECKLIST.md](./PRODUCTION_ENV_CHECKLIST.md)
