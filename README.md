# Bx-Connect

Bx-Connect est un MVP web et mobile conçu dans le contexte de **Bx-Jeunes Impact ASBL**. Il s'agit d'un projet individuel réalisé dans le cadre d'un travail de fin d'études (TFE).

Le projet vise à faciliter la mise en relation des membres, référents, partenaires et responsables de l'association autour des activités, projets, annonces, inscriptions, échanges et suivis proposés par la plateforme.

> État réel : le MVP initial est terminé dans son périmètre défini et a fait l'objet de validations techniques locales. Sa mise en production reste à réaliser ; il ne doit pas être présenté comme un service public opérationnel.

## Objectifs du MVP

- centraliser l'authentification et les profils des utilisateurs ;
- gérer des activités, annonces, projets, groupes et inscriptions ;
- proposer des tableaux de bord et droits adaptés aux rôles ;
- permettre la messagerie et les notifications ;
- préparer l'administration, le suivi et l'exploitation de la plateforme ;
- fournir une base web et mobile cohérente pour les évolutions futures.

## Rôles

- `MEMBRE` : utilisateur inscrit accédant aux fonctions communautaires autorisées ;
- `REFERENT` : accompagnement et suivi des membres et projets relevant de son périmètre ;
- `PARTENAIRE` : accès aux fonctions et projets destinés aux partenaires ;
- `ADMIN` : administration fonctionnelle de la plateforme ;
- `SUPER_ADMIN` : administration étendue et gestion des administrateurs.

Les autorisations restent contrôlées côté backend. Un client ne peut pas choisir librement un rôle privilégié lors de son inscription.

## Architecture

```text
backend/       API REST et logique métier Spring Boot
frontend-web/  interface web React/Vite
mobile/        application React Native/Expo
scripts/       scripts d'exploitation et de sauvegarde
```

## Technologies vérifiées

- Java 21 ;
- Spring Boot 3.4.5 ;
- Maven Wrapper ;
- MySQL et Flyway ;
- React 19 et Vite ;
- React Native et Expo ;
- JUnit, Spring Security Test et Testcontainers ;
- ESLint et tests Node ciblés pour le frontend web.

## Prérequis

- Git ;
- Java 21 ;
- une instance MySQL isolée pour le développement ;
- Node.js et npm compatibles avec les fichiers `package-lock.json` ;
- Docker Desktop pour le test d'intégration MySQL/Testcontainers ;
- Expo Go, un simulateur ou les outils natifs appropriés pour le mobile.

## Configuration

Ne placez jamais de secret réel dans Git. Les fichiers `.env` locaux sont ignorés ; seuls les fichiers `.env.example` documentaires doivent être versionnés.

### Backend

Le fichier `backend/src/main/resources/application.properties.example` répertorie les paramètres attendus sans fournir d'identifiants fonctionnels. Configurez au minimum, selon le profil utilisé :

```text
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
APP_CORS_ALLOWED_ORIGINS
FRONTEND_URL
```

En production, les paramètres de super-administration, SMTP, stockage et observabilité doivent également être fournis par un gestionnaire de secrets ou l'environnement d'exécution.

Stripe et PayPal sont désactivés par défaut :

```text
FEATURES_PAYMENTS_STRIPE_ENABLED=false
FEATURES_PAYMENTS_PAYPAL_ENABLED=false
```

N'activez un fournisseur qu'après avoir configuré et validé ses propres identifiants hors du dépôt.

### Frontend web

Copiez `frontend-web/.env.example` vers `frontend-web/.env.local`, puis adaptez uniquement les valeurs locales nécessaires. Les variables préfixées par `VITE_` sont intégrées au code client et ne doivent jamais contenir de secret.

### Mobile

Copiez `mobile/.env.example` vers `mobile/.env.local`. Les variables `EXPO_PUBLIC_*` sont publiques dans l'application compilée et ne doivent contenir aucun secret.

## Lancement local

### Backend

Après avoir démarré une base MySQL de développement et défini les variables nécessaires :

```bash
cd backend
./mvnw spring-boot:run
```

L'API utilise par défaut le port `8080`. Flyway applique les migrations suivies sous `backend/src/main/resources/db/migration/`.

### Frontend web

```bash
cd frontend-web
npm ci
npm run dev
```

Le script Vite choisit son port local et affiche l'URL dans le terminal.

### Mobile

```bash
cd mobile
npm ci
npm start
```

Les scripts réellement disponibles sont également :

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## Tests et contrôles

### Backend

```bash
cd backend
./mvnw clean verify
```

La suite versionnée couvre notamment la sécurité des endpoints et services, les propriétés de sécurité, les paiements optionnels, les notifications, la réinitialisation de mot de passe et un smoke test MySQL/Testcontainers. Ce dernier nécessite Docker.

### Frontend web

```bash
cd frontend-web
npm ci
npm run lint
npm test
npm run build
```

### Mobile

```bash
cd mobile
npm ci
npm run lint
```

Le dépôt ne contient pas actuellement de suite de tests mobile générale déclarée dans `mobile/package.json`.

## Sécurité

- secrets fournis par variables d'environnement ;
- contrôles d'autorisation côté backend ;
- garde-fous de configuration pour les environnements sensibles ;
- migrations Flyway versionnées ;
- fournisseurs de paiement désactivés par défaut ;
- uploads runtime exclus de Git ;
- procédures d'incident, de sauvegarde et d'exploitation documentées à la racine.

Consultez [SECURITY.md](SECURITY.md) avant de signaler une vulnérabilité. Ne publiez jamais de secret ou de donnée personnelle dans une issue.

## Limites connues

- aucune production publique n'est actuellement annoncée ;
- l'hébergement, le domaine, HTTPS, SMTP, le stockage persistant et le monitoring doivent encore être configurés et validés ;
- une recette de préproduction multi-rôles reste nécessaire ;
- les paiements Stripe et PayPal sont hors du MVP initial et restent désactivés ;
- la publication mobile iOS/Android constitue une phase distincte ;
- les procédures RGPD doivent être complétées et validées avant de traiter des données réelles.

## Statut du projet

**MVP initial terminé et validé techniquement en environnement local ; mise en production encore à réaliser.**

Le futur lien public du dépôt est :

<https://github.com/mmprojet2025-byte/bx-connect-mvp1>

## Licence

Aucune licence open source n'est accordée à ce stade. Le choix de licence et les droits sur les illustrations doivent être confirmés avant l'ajout d'un fichier `LICENSE`.
