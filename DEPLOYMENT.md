# BX-Connect - Deploiement production

Ce document decrit une procedure de deploiement cible. Les commandes exactes
doivent etre validees avec l'hebergeur choisi avant usage en production.

## Preparation d'une release

1. Verifier l'etat Git :

```bash
git status --short
```

2. Lancer les verifications locales pertinentes :

```bash
cd backend && ./mvnw test
cd ../frontend-web && npm run build
cd ../mobile && npm run lint
```

3. Creer un tag/version selon la convention de l'equipe :

```bash
git tag vX.Y.Z
```

Ne pas pousser un tag sans validation humaine de la release.

## Backup avant deploiement

Avant toute migration Flyway ou changement backend, faire un backup complet.
Voir [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

Modele generique a valider selon l'hebergeur :

```bash
mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF \
  -u "$DB_USERNAME" -p "$DB_NAME" > "backup-predeploy-$(date +%Y%m%d-%H%M%S).sql"
```

Le backup doit etre chiffre et stocke hors serveur principal.

## Build backend

Depuis `backend/` :

```bash
./mvnw clean package
```

Verifier que les tests passent avant de construire l'artefact final.

## Build frontend web

Depuis `frontend-web/`, fournir obligatoirement l'URL API production :

```bash
VITE_API_BASE_URL=https://api.example.org/api npm run build
```

`https://api.example.org/api` est un placeholder. Remplacer par le domaine API
definitif.

## Variables backend

Le backend doit demarrer avec les variables documentees dans
[PRODUCTION_ENV_CHECKLIST.md](./PRODUCTION_ENV_CHECKLIST.md), notamment :

```text
SPRING_PROFILES_ACTIVE=prod
BX_PRODUCTION=true
DB_URL=jdbc:mysql://<db-host>:3306/<db-name>?useSSL=true&serverTimezone=UTC
DB_USERNAME=<db-user>
DB_PASSWORD=<db-password>
JWT_SECRET=<strong-secret>
APP_CORS_ALLOWED_ORIGINS=https://app.example.org
FRONTEND_URL=https://app.example.org
```

Ajouter les variables Stripe/PayPal si les paiements sont actifs.

## Variables frontend/mobile

Frontend web :

```text
VITE_API_BASE_URL=https://api.example.org/api
VITE_SENTRY_DSN=<optional-sentry-dsn>
```

Mobile Expo :

```text
EXPO_PUBLIC_API_BASE_URL=https://api.example.org/api
EXPO_PUBLIC_SENTRY_DSN=<optional-sentry-dsn>
```

## Demarrage backend

Modele generique a adapter a l'hebergeur :

```bash
SPRING_PROFILES_ACTIVE=prod BX_PRODUCTION=true java -jar bx-connect.jar
```

Au demarrage :

- le guard de configuration doit accepter uniquement une configuration sure ;
- Flyway doit valider/appliquer les migrations ;
- Hibernate doit valider le schema.

## Healthcheck

Verifier :

```bash
curl -f https://api.example.org/actuator/health
```

Cette commande est un modele. Remplacer le domaine par le domaine API reel.

## Smoke tests

Apres deploiement :

- page d'accueil web accessible ;
- login admin ;
- dashboard admin ;
- dashboard referent ;
- espace partenaire ;
- notifications ;
- messagerie groupe ;
- messagerie metier ;
- creation lecture seule ou action non destructive controlee ;
- paiement en mode attendu ;
- upload image controle ;
- mobile pointe vers `EXPO_PUBLIC_API_BASE_URL` production.

## Criteres d'arret du deploiement

Arreter et revenir en arriere si :

- Flyway echoue ;
- `/actuator/health` ne repond pas `200` ;
- login impossible ;
- erreurs 5xx repetees ;
- paiement/webhook casse ;
- CORS bloque le frontend officiel ;
- logs affichent un secret ;
- une migration DB semble destructive ou inattendue.

## Rollback applicatif

Rollback simple si aucune migration DB incompatible n'a ete appliquee :

1. Remettre la version backend precedente.
2. Remettre le build frontend precedent.
3. Redemarrer.
4. Verifier `/actuator/health`.
5. Refaire les smoke tests.

Si une migration Flyway a ete appliquee, ne pas supposer que le rollback
applicatif suffit. Evaluer la compatibilite schema/application. Si la migration
est incompatible, restaurer le backup pre-deploiement selon
[BACKUP_RESTORE.md](./BACKUP_RESTORE.md).
