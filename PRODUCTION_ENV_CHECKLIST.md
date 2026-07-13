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
| `VITE_SENTRY_DSN` | Recommande | `<sentry-web-dsn>` | Activer seulement apres validation PII. |
| `VITE_ANALYTICS_KEY` | Optionnel | `<analytics-key>` | Ne pas envoyer de donnees personnelles. |

## Mobile Expo

| Variable | Obligatoire | Exemple de placeholder | Contraintes |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Oui pour release | `https://api.example.org/api` | HTTPS, non local. Sans cette variable, le code utilise des fallbacks locaux/dev. |
| `EXPO_PUBLIC_SENTRY_DSN` | Recommande | `<sentry-mobile-dsn>` | Sentry mobile, PII desactivee dans le code. |
| `EXPO_PUBLIC_ANALYTICS_KEY` | Optionnel | `<analytics-key>` | Ne pas envoyer de donnees personnelles. |

## A confirmer selon l'hebergeur

- Nom exact du domaine frontend.
- Nom exact du domaine API.
- Methode de stockage des secrets.
- Rotation des secrets.
- Configuration TLS et renouvellement certificat.
- Chemin et retention des logs.
- Service de sauvegarde hors serveur principal.
