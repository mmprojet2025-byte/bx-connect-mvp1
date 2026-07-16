# BX-Connect - Checklist variables production

Ce document liste les variables a definir pour une exploitation reelle. Ne jamais
committer de vraies valeurs, secrets, dumps, fichiers `.env` de production ou
captures contenant ces valeurs.

## Backend Spring

| Variable | Obligatoire | Exemple de placeholder | Contraintes |
| --- | --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | Oui | `prod` | Doit valoir `prod`. |
| `BX_PRODUCTION` | Oui | `true` | Doit valoir `true` en production. |
| `DB_URL` | Oui | `jdbc:mysql://<db-host>:3306/<db-name>?useSSL=true&serverTimezone=UTC` | Pas de localhost, pas de `useSSL=false`, pas de `createDatabaseIfNotExist=true`, pas de `allowPublicKeyRetrieval=true`. |
| `DB_USERNAME` | Oui | `<db-user>` | Compte applicatif dedie, droits minimaux. |
| `DB_PASSWORD` | Oui | `<db-password>` | Secret fort, rotation documentee. |
| `JWT_SECRET` | Oui | `<random-strong-secret-32-bytes-min>` | Secret fort, 32 octets minimum. |
| `APP_CORS_ALLOWED_ORIGINS` | Oui | `https://app.example.org,https://admin.example.org` | HTTPS uniquement, pas de wildcard, pas de localhost. |
| `FRONTEND_URL` | Oui | `https://app.example.org` | HTTPS, non local. |
| `STRIPE_SECRET_KEY` | Oui si Stripe actif | `<stripe-live-secret-key>` | Secret Stripe live, jamais dans Git. |
| `STRIPE_PUBLISHABLE_KEY` | Oui si Stripe actif | `<stripe-live-publishable-key>` | Cle publique, a garder en configuration. |
| `STRIPE_WEBHOOK_SECRET` | Oui si Stripe actif | `<stripe-live-webhook-secret>` | Secret webhook live. |
| `STRIPE_SUCCESS_URL` | Oui si Stripe actif | `https://app.example.org/paiement/succes` | HTTPS, non local. |
| `STRIPE_CANCEL_URL` | Oui si Stripe actif | `https://app.example.org/paiement/annule` | HTTPS, non local. |
| `PAYPAL_CLIENT_ID` | Oui si PayPal actif | `<paypal-live-client-id>` | Identifiant PayPal live. |
| `PAYPAL_CLIENT_SECRET` | Oui si PayPal actif | `<paypal-live-client-secret>` | Secret PayPal live. |
| `PAYPAL_MODE` | Oui si PayPal actif | `live` | `live` en production reelle. |
| `PAYPAL_RETURN_URL` | Oui si PayPal actif | `https://api.example.org/api/paiements/confirmer` | HTTPS, non local. |
| `PAYPAL_CANCEL_URL` | Oui si PayPal actif | `https://api.example.org/api/paiements/annuler` | HTTPS, non local. |

## Frontend web Vite

| Variable | Obligatoire | Exemple de placeholder | Contraintes |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Oui | `https://api.example.org/api` | HTTPS, non local. Sans cette variable, le code retombe sur localhost. |
| `VITE_SENTRY_DSN` | Recommande | `<sentry-web-dsn>` | Runtime navigateur. Activer seulement apres validation PII. |
| `VITE_SENTRY_ENVIRONMENT` | Recommande si Sentry actif | `preprod` ou `production` | Environnement visible dans Sentry. |
| `VITE_SENTRY_RELEASE` | Recommande si Sentry actif | `<git-tag-or-ci-release>` | Source de verite release web, identique a la release utilisee pour l'upload sourcemaps. |
| `VITE_SENTRY_DIST` | Optionnel | `<build-number>` | Distribution visible cote navigateur si l'equipe segmente les builds. Doit correspondre a `SENTRY_DIST` si les deux sont utilises. |
| `VITE_ANALYTICS_KEY` | Optionnel | `<analytics-key>` | Ne pas envoyer de donnees personnelles. |

## Frontend web Sentry - variables CI/build

Ces variables sont utilisees uniquement pendant le build CI pour uploader les
sourcemaps vers Sentry. Elles ne doivent jamais etre prefixees par `VITE_` et
ne doivent jamais etre exposees au navigateur.

| Variable | Obligatoire | Exemple de placeholder | Contraintes |
| --- | --- | --- | --- |
| `SENTRY_AUTH_TOKEN` | Oui pour upload sourcemaps | `<sentry-ci-token>` | Secret CI uniquement, jamais dans Git, rotation reguliere. |
| `SENTRY_ORG` | Oui pour upload sourcemaps | `<sentry-org-slug>` | Slug organisation Sentry. |
| `SENTRY_PROJECT` | Oui pour upload sourcemaps | `<sentry-web-project-slug>` | Slug projet Sentry web. |
| `SENTRY_DIST` | Optionnel | `<build-number>` | Distribution d'upload. Doit correspondre a `VITE_SENTRY_DIST` si le runtime renseigne aussi `dist`. |

## Mobile Expo

| Variable | Obligatoire | Exemple de placeholder | Contraintes |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Oui pour release | `https://api.example.org/api` | HTTPS, non local. Sans cette variable, le code utilise des fallbacks locaux/dev. |
| `EXPO_PUBLIC_SENTRY_DSN` | Recommande | `<sentry-mobile-dsn>` | DSN public mobile. PII desactivee dans le code. |
| `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | Recommande si Sentry actif | `preprod` ou `production` | Environnement visible dans Sentry. Les profils EAS le definissent deja. |
| `EXPO_PUBLIC_SENTRY_RELEASE` | Recommande si Sentry actif | `bx-connect-mobile@1.0.0` | Release runtime mobile. Doit correspondre aux artifacts sourcemaps uploades. |
| `EXPO_PUBLIC_SENTRY_DIST` | Recommande si Sentry actif | `ios-1` ou `android-1` | Distribution runtime. Ne jamais contenir de donnee personnelle. |
| `EXPO_PUBLIC_ANALYTICS_KEY` | Optionnel | `<analytics-key>` | Ne pas envoyer de donnees personnelles. |

## Mobile Sentry - variables EAS/CI secretes

Ces variables servent a l'upload des sourcemaps et artifacts Sentry pendant les
builds EAS/CI. Elles ne doivent jamais etre prefixees par `EXPO_PUBLIC_` et ne
doivent jamais etre embarquees dans l'application.

| Variable | Obligatoire | Exemple de placeholder | Contraintes |
| --- | --- | --- | --- |
| `SENTRY_AUTH_TOKEN` | Oui pour upload sourcemaps mobile | `<sentry-ci-token>` | Secret EAS/CI uniquement, jamais dans Git, rotation reguliere. |
| `SENTRY_ORG` | Oui pour upload sourcemaps mobile | `<sentry-org-slug>` | Slug organisation Sentry. |
| `SENTRY_PROJECT` | Oui pour upload sourcemaps mobile | `<sentry-mobile-project-slug>` | Slug projet Sentry mobile. |

Convention recommandee :

- release mobile : `bx-connect-mobile@<expo.version>` ;
- dist iOS : `ios-<ios.buildNumber>` ;
- dist Android : `android-<android.versionCode>`.

`ios.buildNumber` et `android.versionCode` doivent etre incrementes pour chaque
build distribue. La release et le dist des events runtime doivent correspondre
aux sourcemaps/artifacts uploades pour le meme build.

## A confirmer selon l'hebergeur

- Nom exact du domaine frontend.
- Nom exact du domaine API.
- Methode de stockage des secrets.
- Rotation des secrets.
- Configuration TLS et renouvellement certificat.
- Chemin et retention des logs.
- Service de sauvegarde hors serveur principal.
