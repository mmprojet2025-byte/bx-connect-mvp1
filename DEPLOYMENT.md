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

Depuis `frontend-web/`, fournir obligatoirement l'URL API production et, si
Sentry est actif, une release explicite :

```bash
VITE_API_BASE_URL=https://api.example.org/api \
VITE_SENTRY_ENVIRONMENT=production \
VITE_SENTRY_RELEASE=<git-tag-or-ci-release> \
npm run build
```

`https://api.example.org/api` est un placeholder. Remplacer par le domaine API
definitif. La valeur `VITE_SENTRY_RELEASE` doit venir du tag Git ou de la
version CI validee pour la release.

### Sourcemaps Sentry web

Le frontend web est compatible avec l'upload Sentry via le plugin Vite officiel.
Le plugin ne s'active que si toutes les variables CI/build suivantes sont
presentes au moment du build :

```text
SENTRY_AUTH_TOKEN=<sentry-ci-token>
SENTRY_ORG=<sentry-org-slug>
SENTRY_PROJECT=<sentry-web-project-slug>
VITE_SENTRY_RELEASE=<git-tag-or-ci-release>
```

`SENTRY_AUTH_TOKEN` est un secret CI uniquement. Ne jamais le prefixer par
`VITE_`, ne jamais le committer et ne jamais l'exposer au navigateur.

Ordre recommande :

1. Definir la release (`VITE_SENTRY_RELEASE`) depuis le tag Git ou la CI.
2. Lancer le build frontend avec les variables runtime et CI Sentry.
3. Laisser le plugin uploader les sourcemaps vers Sentry.
4. Verifier que les fichiers `.map` ont ete supprimes du dossier `dist/`.
5. Deployer uniquement le contenu final sans `.map` publics.
6. Declencher une erreur controlee en preproduction et verifier la resolution
   de stacktrace dans Sentry.

Controle local apres build :

```bash
find dist -name '*.map' -print
```

La commande ne doit rien afficher pour un build deployable publiquement.

Si `SENTRY_DIST` et `VITE_SENTRY_DIST` sont utilises, ils doivent porter la
meme valeur de build. Sans `SENTRY_DIST`, la release seule suffit.

Le token Sentry doit etre stocke dans le gestionnaire de secrets CI/hebergeur et
faire l'objet d'une rotation reguliere, notamment apres tout changement
d'equipe ou incident.

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
PASSWORD_RESET_EMAIL_ENABLED=true
PASSWORD_RESET_TOKEN_TTL=PT15M
PASSWORD_RESET_FRONTEND_URL=https://app.example.org/reinitialiser-mot-de-passe
PASSWORD_RESET_FROM_ADDRESS=no-reply@example.org
MAIL_HOST=smtp.example.org
MAIL_PORT=587
MAIL_USERNAME=<smtp-user>
MAIL_PASSWORD=<smtp-password>
```

Ajouter les variables Stripe/PayPal si les paiements sont actifs.

## Variables frontend/mobile

Frontend web :

```text
VITE_API_BASE_URL=https://api.example.org/api
VITE_SENTRY_DSN=<optional-sentry-dsn>
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=<git-tag-or-ci-release>
VITE_SENTRY_DIST=<optional-build-number>
```

Mobile Expo :

```text
EXPO_PUBLIC_API_BASE_URL=https://api.example.org/api
EXPO_PUBLIC_SENTRY_DSN=<optional-sentry-dsn>
EXPO_PUBLIC_SENTRY_ENVIRONMENT=production
EXPO_PUBLIC_SENTRY_RELEASE=bx-connect-mobile@1.0.0
EXPO_PUBLIC_SENTRY_DIST=ios-1
```

Pour Android, `EXPO_PUBLIC_SENTRY_DIST` doit suivre le build Android, par
exemple `android-1`. Ne jamais inclure d'email, identifiant utilisateur ou
donnee personnelle dans la release ou le dist.

## Builds mobile EAS et Sentry

Le projet mobile contient des profils EAS generiques `development`, `preview`
et `production`. Ils ne contiennent aucun secret. Les secrets Sentry doivent
etre fournis via EAS Secrets ou le gestionnaire de secrets CI :

```text
SENTRY_AUTH_TOKEN=<sentry-ci-token>
SENTRY_ORG=<sentry-org-slug>
SENTRY_PROJECT=<sentry-mobile-project-slug>
```

Ne jamais utiliser `EXPO_PUBLIC_SENTRY_AUTH_TOKEN` et ne jamais mettre
`SENTRY_AUTH_TOKEN` dans `app.json`, `eas.json` ou un fichier committe.

Convention mobile recommandee :

- release : `bx-connect-mobile@<expo.version>` ;
- dist iOS : `ios-<ios.buildNumber>` ;
- dist Android : `android-<android.versionCode>`.

Avant chaque build distribue :

1. Incrementer `ios.buildNumber` et/ou `android.versionCode`.
2. Definir `EXPO_PUBLIC_SENTRY_RELEASE` avec la release mobile attendue.
3. Definir `EXPO_PUBLIC_SENTRY_DIST` selon la plateforme construite.
4. Lancer le build EAS `preview` ou `production`.
5. Laisser le plugin `@sentry/react-native/expo` et les secrets EAS/CI gerer
   l'upload des sourcemaps/artifacts.
6. Declencher une erreur JS volontaire en preview.
7. Verifier dans Sentry que la stacktrace est symboliquee, que `release` et
   `dist` correspondent au build, et qu'aucune donnee personnelle n'est envoyee.
8. Verifier que `SENTRY_AUTH_TOKEN` n'apparait pas dans le bundle exporte ni
   dans les logs publics.

Ne pas lancer de build EAS production sans projet Sentry mobile de
preproduction valide et sans validation humaine de la stacktrace.

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
