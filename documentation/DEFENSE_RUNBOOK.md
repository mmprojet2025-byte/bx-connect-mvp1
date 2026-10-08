# Procédure de démonstration Web — BX-Connect

État documentaire : 7 octobre 2026, après la réception réelle du lot 8 sur la copie
isolée. Les preuves locales ne valent pas validation de l'environnement original
ou d'un déploiement distant. Aucun mot de passe, jeton, secret Stripe ni lien de
réinitialisation ne doit figurer dans ce document.

## 1. Choisir explicitement l’environnement

| Environnement | Web | API | Base | Usage |
| --- | --- | --- | --- | --- |
| Local habituel | `http://localhost:5173` | `http://localhost:8080` | Configuration MySQL originale à vérifier | Données originales : aucune reprise autorisée par ce guide |
| Répétition isolée de cet audit | `http://localhost:5181` | `http://localhost:18081` | `defense_copy`, MySQL local publié sur `127.0.0.1:13316` | Copie et comptes jetables ; tests et démonstration de préparation |
| Déploiement | URL HTTPS du site | URL HTTPS de l’API, suffixe `/api` pour Vite | Base distante explicitement configurée | Non validé par les preuves locales |

Ne pas confondre `localhost` et `127.0.0.1` dans les URLs du navigateur : leurs
sessions sont distinctes. Conserver la même origine Web pour login, liens email et
retour Stripe. Vérifier le profil, le port et le nom de base dans le démarrage,
pas seulement l’URL affichée par le navigateur.

Avant les manipulations : `git status --short`, `git branch --show-current`,
`git log -1 --oneline`. Branche attendue : `test-final-defense-2026`. Le tag
`backup-before-final-audit-20261007` protège le code, pas les données.

Les sauvegardes vérifiées MySQL/uploads, secrets, logs détaillés et manifestes de
reprise restent hors Git. Ne pas restaurer, migrer ou réparer la base originale
par défaut. Les reprises originales Stripe et référents/activités restent soumises
à une autorisation distincte : voir [STRIPE_RECOVERY_RUNBOOK.md](STRIPE_RECOVERY_RUNBOOK.md)
et [GROUP_REFERENT_REPAIR.md](GROUP_REFERENT_REPAIR.md).

## 2. Paramètres indispensables, sans leurs secrets

Les variables doivent être effectivement injectées dans le processus Spring.
Un fichier `.env` lu par Docker Compose n’est pas automatiquement chargé par
`./mvnw spring-boot:run`. Conserver les secrets dans l’environnement ou un fichier
privé protégé ; ne pas les mettre en arguments de commande, captures ou commits.
Les variables `VITE_*` sont publiques dans le bundle navigateur.

| Paramètre | Développement / répétition | Production |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` / `BX_PRODUCTION` | `dev` / `false` ; `dev` est aussi le profil par défaut | `prod` / `true` obligatoires |
| Connexion MySQL | `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `DB_PASSWORD` ; URL du clone pour la répétition | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` ; aucune URL locale, aucun `useSSL=false` |
| `JWT_SECRET` | Secret local dédié à l’environnement ; ne pas partager les sessions original/clone | Secret robuste distinct, au moins 32 octets, aucune valeur de démonstration |
| Fuseau JVM | `TZ=Europe/Brussels` ou `-Duser.timezone=Europe/Brussels` explicite | Même fuseau métier et politique documentée ; ne pas laisser le serveur choisir implicitement |
| Port backend | `SERVER_PORT` ou `--server.port` ; 8080 habituel, 18081 isolé | Port attribué par l’hébergement |
| `VITE_API_BASE_URL` | `http://localhost:18081/api` sur le clone ; 8080 pour le local habituel | URL HTTPS non locale obligatoire, terminée par `/api` |
| CORS | `APP_CORS_ALLOWED_ORIGINS` limité à l’origine Web utilisée ; les profils locaux tolèrent localhost | Origines HTTPS explicites, sans joker ni localhost |
| URL Web backend | Propriété `frontend.url`, explicite si port différent de 5173 | `FRONTEND_URL` HTTPS |
| Stripe | `FEATURES_PAYMENTS_STRIPE_ENABLED=true` uniquement avec configuration TEST complète | Fournisseur désactivé tant que l’environnement n’est pas validé ; aucune opération LIVE autorisée ici |
| Secrets Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` du même compte TEST et du listener visé | Secrets de l’endpoint hébergé correspondant, hors Git |
| Retours Stripe | Propriétés `stripe.success-url` et `stripe.cancel-url` vers le Web ciblé | `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` HTTPS |
| PayPal | `FEATURES_PAYMENTS_PAYPAL_ENABLED=false` pour cette répétition | Hors scénario de réception Stripe ; ne pas activer implicitement |
| Réinitialisation email | `PASSWORD_RESET_EMAIL_ENABLED=true` seulement avec SMTP contrôlé configuré | Activation requise par le garde-fou de production |
| Liens email | `PASSWORD_RESET_FRONTEND_URL`, `PASSWORD_RESET_FROM_ADDRESS`, `PASSWORD_RESET_TOKEN_TTL` (15 minutes par défaut) | URL HTTPS, expéditeur utilisable, TTL adapté |
| SMTP | Propriétés `spring.mail.*` explicitement injectées en dev, ex. variables `SPRING_MAIL_HOST`/`SPRING_MAIL_PORT` ; capture locale pour l’audit | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` ; authentification et STARTTLS requis par le profil prod |
| Uploads | Propriétés `upload.dir` absolue et `upload.base-url` explicites ; répertoire de la copie | `UPLOAD_DIR` persistant et `UPLOAD_BASE_URL` HTTPS |
| Premier SUPER_ADMIN | `BX_SUPER_ADMIN_EMAIL` / `BX_SUPER_ADMIN_PASSWORD` seulement pour un amorçage autorisé sur base vide | Secret d’amorçage protégé ; aucun compte créé si mot de passe absent |

Les valeurs factices du profil dev ne rendent pas Stripe opérationnel. Désactiver
le fournisseur ou fournir de vrais identifiants TEST, sans publier leurs valeurs.
La clé publique n’est pas utilisée pour confirmer un paiement navigateur : le
parcours redirige vers Stripe Checkout. Le backend exige néanmoins sa configuration.

## 3. Démarrage reproductible

Java 21, npm/Node compatibles avec le lockfile, MySQL, et Docker pour les tests
Testcontainers doivent être disponibles. Utiliser une copie de travail isolée pour
Maven/Playwright : une compilation dans `backend/target` du processus habituel peut
déclencher son hot reload et toucher son environnement.

### Répétition isolée

La copie préparée pour cet audit est
`/private/tmp/bx-defense-final-20261007`. Son fichier privé `isolated-env.json` et
ses scripts de lancement ne sont pas versionnés. Ne pas les afficher : ils
contiennent des secrets de test. Leurs chemins sont propres à cette machine.

Après injection des secrets protégés et vérification de la cible, le lancement
manuel équivalent du backend est, depuis le dossier `backend` de cette copie :

```sh
./mvnw -DskipTests package
SPRING_PROFILES_ACTIVE=dev java -Duser.timezone=Europe/Brussels -Dspring.devtools.restart.enabled=false -jar target/bx-connect-0.0.1-SNAPSHOT.jar \
  --server.port=18081 \
  '--spring.datasource.url=jdbc:mysql://127.0.0.1:13316/defense_copy?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true' \
  --spring.datasource.username=root \
  --upload.dir=/private/tmp/bx-defense-final-20261007/backend/uploads \
  --upload.base-url=http://localhost:18081/uploads \
  --frontend.url=http://localhost:5181 \
  --stripe.success-url=http://localhost:5181/paiement/succes \
  --stripe.cancel-url=http://localhost:5181/paiement/annule \
  --account-deletion.anonymization-cron=- \
  --bx.demo.partners.enabled=false
```

Le processus Java doit recevoir les secrets et la configuration email appropriée. Le script privé de l’audit le fait déjà.
Lancer un seul backend par port ; ne pas exécuter ces commandes si le service est
déjà actif. Ne jamais arrêter le processus sur 8080 pour redémarrer celui sur 18081.

Depuis `frontend-web` de la copie, après installation des dépendances du lockfile :

```sh
VITE_API_BASE_URL=http://localhost:18081/api npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
```

Ouvrir `http://localhost:5181`, puis vérifier :

```sh
curl --fail http://localhost:18081/actuator/health
```

Cette commande de santé ne démontre ni un paiement réussi ni une configuration
SMTP correcte. Vérifier séparément ces parcours.

Conserver une JVM en `Europe/Brussels` : les fenêtres de paiement des activités
et les dates de projet utilisent ce fuseau métier, mais les présences et les
jetons de réinitialisation emploient encore `LocalDateTime.now()` de la JVM.
Les dates/heures d’activités sont locales, sans fuseau stocké dans le champ.
Ce réglage rend la démonstration cohérente ; il ne prouve pas une gestion générale
de tous les fuseaux. Ne pas modifier les dates globalement pour cette recette.

### Local habituel

Seulement après identification/accord sur l’environnement original : lancer
`./mvnw spring-boot:run` depuis son `backend`, et `npm run dev -- --port 5173 --strictPort`
depuis son `frontend-web`, avec l’API 8080 et la base réellement attendue.
L’URL commune par défaut vise MySQL 3306 ; le `compose.yml` du dépôt publie 3307
par défaut. Les variables `SPRING_DATASOURCE_*` doivent résoudre cette différence.
Ne pas lancer `docker compose up` pour « réparer » le clone déjà disponible sur 13316.

Les corrections et le lockfile sont versionnés, mais l'installation `node_modules`
originale n'a pas été remplacée par celle validée sur la copie. Le serveur habituel
5173 et son installation ne prouvent donc pas l'exécution des dépendances finales.
Prévoir une installation du lockfile par `npm ci` avant son prochain démarrage,
après arrêt du serveur concerné et accord sur cet environnement ; ne pas lancer
cette opération pendant la démonstration. Les anciennes données de paiement et
d'affectation référent de la base originale n'ont pas été reprises par cet audit.

### Build de déploiement

Depuis une copie `frontend-web`, avec l’URL réelle de déploiement approuvée :

```sh
VITE_API_BASE_URL="${BX_APPROVED_DEPLOYMENT_API_URL:?URL HTTPS API de déploiement requise}" npm run build
```

La validation Vite doit refuser une URL absente, HTTP ou localhost. Ne pas la
retirer, changer `PROD` ou utiliser un faux nom de domaine pour prétendre valider
le déploiement. Un build compilé vers un domaine d’exemple prouve uniquement la
compilation ; le service distant reste non testé. La démonstration locale utilise
le serveur de développement avec son URL HTTP explicite.

## 4. Stripe TEST, du Checkout aux effets métier

Avant le parcours payant, vérifier hors sortie publique : compte Stripe TEST
correct, clé backend du même compte, listener actif, secret de signature cohérent,
retours vers le Web 5181 pour la copie. Aucun LIVE ni remboursement externe.

```sh
stripe listen --events checkout.session.completed,checkout.session.expired --forward-to http://localhost:18081/api/stripe/webhook
```

Le secret affiché par ce listener doit être injecté dans `STRIPE_WEBHOOK_SECRET`
du backend isolé, puis ce backend seul redémarré si sa configuration a changé.
Ne pas copier le secret d’un endpoint HTTPS différent. Sur le local habituel,
l’URL de forwarding utilise 8080 seulement si ce backend est celui explicitement
retenu pour le test ; ne pas laisser simultanément une autre livraison vers la
base originale.

La page de retour ne confirme jamais le paiement. Attendre la confirmation
Stripe, la livraison HTTP 200 puis les effets métier :

- activité : paiement `PAYE`, inscription `PAYEE`, état conservé après F5 ;
- projet : paiement `PAYE`, participation unique, reçu de projet disponible et
  état conservé après F5 ;
- doublon d’événement : aucun paiement, participation ou reçu supplémentaire.

Une réponse HTTP 200 seule ne suffit pas. Un Checkout projet revient actuellement
sur `/mes-factures?recu=...` à partir de l’origine de `stripe.success-url` ; une
activité utilise `/paiement/succes?session_id=...`. Les URLs doivent donc viser
le même frontend connecté.

Pour un paiement ancien réellement payé, utiliser la vérification serveur décrite
dans le runbook de reprise, jamais un nouveau Checkout, `stripe trigger` ni un
`UPDATE ... PAYE`. Démarrer le listener ne renvoie pas les anciens événements.
Avant « Reprendre », laisser le serveur vérifier la session réutilisable.

À la fin du lot 8, le listener TEST vers 18081 a été **arrêté volontairement** pour
éviter toute confusion avec un listener destiné à 8080. Le Web 5181 et le backend
18081 restent actifs, mais cela ne suffit plus à confirmer automatiquement un
nouveau Checkout. Avant de répéter un paiement : relancer le listener ci-dessus,
injecter son secret de signature dans le backend isolé et redémarrer uniquement
ce backend si nécessaire. Vérifier à nouveau la cible 18081 et les retours 5181.
Ne pas réutiliser aveuglément le secret d'une ancienne session de listener.

## 5. Migrations : preuves et limites

Constat du lot 5 : 14 migrations versionnées, V1 à V14, sans doublon. Aucun fichier
SQL de ces migrations modifié depuis `0f1fc91`. Le README historique des migrations
et le README général mentionnent encore V1–V5 : cela ne décrit plus l’inventaire réel.

Preuves exécutées dans la suite isolée du lot 4, le 7 octobre 2026 :

- base MySQL vide `group_permissions_test` : validation des 14 migrations puis
  application V1–V14 à 14:44:21–14:44:23, démarrage Hibernate avec `ddl-auto=validate` ;
- tests des schémas historiques : V8→V14 dans `ActiviteAdditiveSchemaMySqlTest`,
  V7→V14 dans `ActiviteVisibilityMySqlTest` ;
- suite Groupes/Activités/inscriptions : 351 tests réussis, zéro échec, erreur ou
  ignoré ; log privé `/tmp/bx-lot4-groups-maven.log` ;
- copie restaurée `defense_copy` : démarrages réels à 13:07, 13:32 et 13:51,
  validation de 14 migrations, version 14 à jour, API démarrée sur 18081.

La copie déjà en V14 prouve la compatibilité/validation du schéma existant ; elle
ne simule pas une montée de version depuis n’importe quel ancien schéma.
Conserver `ddl-auto=validate`, `validate-on-migrate=true`,
`baseline-on-migrate=false`, `clean-disabled=true`. Aucun `flyway repair`, aucune
modification d’ancienne migration, aucune migration appliquée à l’original ici.

## 6. Images, email et persistance

Les images sont enregistrées sur le système de fichiers, pas dans la base ni dans
un stockage objet distant. Sauvegarder MySQL et le répertoire `upload.dir` ensemble.
Un chemin relatif dépend du répertoire de lancement ; employer un chemin absolu
stable. La copie utilise son propre dossier `backend/uploads`.

L’API `/api/upload` exige une authentification ; les images d’activités exigent un
ADMIN/RÉFÉRENT organisateur. Taille serveur maximale : 5 Mo par image, formats
JPG/PNG/WEBP. Les URLs `/uploads/**` sont servies par le backend ; vérifier l’origine
et l’accessibilité depuis le navigateur après F5 puis après redémarrage du backend.
Ne pas conclure que les fichiers persistent chez un hébergeur éphémère : aucun
stockage distant ni déploiement n’est validé par l’existence du dossier local.

Preuve réelle du lot 5, sans mocks : 29 assertions réussies. Un ADMIN de la copie
charge une image PNG de 461 866 octets par API puis depuis l’interface française
réelle sous Chromium et WebKit. Les contrôles couvrent le multipart, le HTTP 200,
le type activité, l’aperçu visible/décodé et l’égalité SHA-256 source/HTTP/disque.
Après redémarrage du backend 18081, les trois URLs (API et deux navigateurs)
restent accessibles et renvoient les mêmes octets : 4 assertions API, 16 navigateur,
9 après redémarrage. Le backend original 8080 n’a pas été redémarré.

Les preuves privées `lot5-upload-proof-private.json` et
`lot5-real-browser-upload-private.json` sont conservées dans le dossier de
répétition hors Git. Cela valide le stockage local de la copie après redémarrage
JVM et l’upload ADMIN en FR sur les deux moteurs ; pas tous les rôles/langues,
ni la conservation lors du remplacement d’un conteneur ou chez un hébergeur.

Le profil dev désactive l’envoi des liens de réinitialisation par défaut. Une
réponse publique positive à « Mot de passe oublié » ne prouve pas l’envoi SMTP.
Tester uniquement une adresse contrôlée : réception, lien valide, expiration,
usage unique, connexion avec le nouveau mot de passe, réponse identique pour une
adresse inconnue. Ne pas partager un lien complet contenant son jeton.

Preuve du lot 5 : deux scénarios réels backend/SMTP contrôlé sur TCP local 11025,
avec 23 assertions réussies (13 pour le parcours nominal, 10 pour l’expiration).
Le message reçu contient un lien vers le vrai frontend 5181. La recette vérifie
le lien valide, son usage unique, la connexion avec le nouveau mot de passe,
l’invalidation de l’ancien JWT et le rejet d’un lien expiré. Pour un compte
inconnu, aucun email n’est envoyé ; le statut HTTP et le corps de réponse publics
restent identiques à ceux d’un compte connu.

Les preuves finales sont `lot5-controlled-smtp-success-proof.json` et
`lot5-controlled-smtp-expiration-proof.json`, hors Git dans le dossier de
répétition ; elles remplacent la première tentative incomplète.
Cette preuve utilise une capture SMTP locale, sans envoi à un utilisateur réel.
La capture SMTP a été arrêtée après la recette. La redémarrer et configurer
le backend isolé avant une nouvelle démonstration du reset.
La livraison via un fournisseur dans une boîte externe reste **non validée**.
La configuration `MAIL_*` de l’environnement original est absente : le succès
sur la copie ne rend pas son envoi opérationnel. L’envoi SMTP est synchrone et le
chemin d’un compte connu peut être plus lent : la neutralité temporelle n’est
pas démontrée. Aucun délai artificiel ou nouveau mécanisme email n’est ajouté.

## 7. Comptes, répétition et contrôle avant jury

Aucun mot de passe dans le rapport. Employer des profils/contextes navigateur
séparés par rôle ; ne pas alterner les rôles dans un même localStorage.

| Rôle | Compte de la copie / préparation | Contrôle attendu |
| --- | --- | --- |
| VISITEUR | Contexte sans session | Catalogues publics ; connexion et retour à la destination |
| ADMIN | `admin-2@defense.invalid` | Création du groupe, affectation du référent, validation finale projet |
| RÉFÉRENT | `referent-8@defense.invalid` | Adhésions, membres, activités et projets de son groupe |
| RÉFÉRENT extérieur | `referent-3@defense.invalid` | Refus API des données/actions d’un autre groupe |
| MEMBRE | Compte 25 pour Chromium, 27 pour WebKit ; adresses dans `real-groups-projects-<navigateur>.json`, hors Git | Demande acceptée, participation gratuite, Stripe TEST, reçu de projet |
| SUPER_ADMIN | `super_admin-1@defense.invalid`, compte 1 de la copie | Gestion des ADMIN, périmètre transversal autorisé |
| PARTENAIRE | Décisions documentaires contradictoires ; arbitrage requis | Espace existant inchangé ; aucun masquage global appliqué par cet audit |

Les identifiants ci-dessus désignent seulement la copie de préparation. Ne pas
les réutiliser pour sélectionner des lignes dans la base originale. Les comptes
MEMBRE refusés 26 et 28 ont ensuite été supprimés dans la recette réelle de
suppression de compte ; ne pas les employer pour une nouvelle connexion.
Les ADMIN 29 et 30 sont des comptes jetables créés, désactivés puis réactivés
pendant la recette SUPER_ADMIN. Leurs adresses restent dans les manifestes privés
`real-account-tools-<navigateur>.json`. Aucun mot de passe n'est publié ici.

Avant le jury :

1. Vérifier l’environnement et les sauvegardes hors Git ; aucun terminal de
   secrets affiché au partage d’écran.
2. Démarrer les services nécessaires, tester la santé de l’API, le login par rôle,
   les images et les liens de notification.
3. Vérifier dates, fuseau Europe/Brussels, capacités disponibles et échéances :
   un nouveau Checkout d’activité est autorisé jusqu’à 31 minutes avant sa
   clôture, borne exacte incluse. Prévoir une marge confortable pour la démo ;
   ne pas raccourcir cette règle.
4. Vérifier listener TEST, signature et effets métier avant de présenter Stripe.
   Une panne Stripe/réseau se signale ; le parcours gratuit sert de scénario de
   secours, sans prétendre que le paiement a été validé.
5. Répéter groupe → adhésion → acceptation/refus → suspension/réactivation,
   activité gratuite, activité payante TEST, projet brouillon → soumission →
   correction persistée après F5 → nouvelle soumission → validations → participation.
6. Vérifier notification, messagerie MEMBRE/RÉFÉRENT, profil, exports PDF/CSV
   concernés et téléchargement du reçu de projet.
7. Relever les preuves réelles Chromium et WebKit séparément des tests avec mocks.
   Le verdict final dépend de cette réception ; ne pas appeler « testé » un chemin
   seulement lu ou simulé.

## 8. Réception réelle du 7 octobre 2026

La recette a utilisé les vrais Web 5181, backend 18081 et MySQL 13316, sans réponse
API simulée, dans des contextes séparés par rôle. Chromium et WebKit ont validé les
parcours suivants en français sur écran desktop :

| Parcours | Preuve constatée |
| --- | --- |
| Visiteur et connexion | Sept pages, images décodées, retour au projet choisi après login, F5 ; aucun Checkout automatique |
| Groupes | Création ADMIN et affectation, adhésion acceptée/refusée, suspension/réactivation sans désactiver le compte ; API non autorisées refusées |
| Projets gratuits | Brouillon, soumission, commentaire de correction conservé après F5, correction/resoumission, validation RÉFÉRENT puis ADMIN, participation unique |
| Activités gratuites | Création avec image, publication, inscription confirmée et F5 |
| Présences | Saisie après la vraie heure de début, sauvegarde, clôture immuable et refus API hors périmètre |
| Stripe TEST | Une activité et un projet par moteur : quatre paiements de 1 EUR, quatre sessions distinctes `complete/paid`, webhooks HTTP 200 et états métier persistés après F5 |
| Reçus de projet | Reçus PDF téléchargés pour les projets payants 10 et 12 ; participation et paiement uniques |
| Notifications et messagerie | Notifications réelles d'adhésion/projet, lecture/destination/F5 ; messages MEMBRE ↔ RÉFÉRENT enregistrés et relus, tiers refusés |
| Profil | Modification et upload d'avatar, image décodée, octets identiques après relecture, rôle/email conservés |
| Rapports ADMIN | Vrais PDF/CSV téléchargés, cinq indicateurs écran/CSV identiques sur chaque moteur ; aucune adresse des comptes de recette présente |
| SUPER_ADMIN | Confirmation des mots de passe, création/désactivation/réactivation ADMIN, ancien JWT rejeté, permissions et journal |
| Suppression de compte | Deux comptes jetables sans paiement supprimés, session effacée, retour accueil, F5/historique et protection du profil |

Granularité des preuves : 24 étapes Groupes/Projets, dix scénarios complémentaires,
quatre scénarios Stripe avec 26 contrôles, huit contrôles de présence, 16 étapes
visiteur/connexion et six contrôles de suppression. Ces nombres décrivent des
étapes de recette, pas des tests unitaires ni des assertions de même granularité.
Le backend complet a également passé 983 tests dans une copie indépendante avec
Docker/MySQL Testcontainers, zéro échec, erreur ou ignoré. Les résultats de la suite
navigateur globale et les incidents intermédiaires sont consignés dans
[FINAL_DEFENSE_AUDIT.md](FINAL_DEFENSE_AUDIT.md).

Les manipulations interrompues ont été reprises sur les mêmes données : corrections
du harnais de test, aucune validation forcée ni nouveau paiement pour contourner un
échec. Une navigation WebKit a été interrompue, puis le même parcours a été validé
à la reprise. La limite de connexion 10/minute/IP a produit HTTP 429 sous la charge
de recette ; l'attente normale a été respectée sans modifier les seuils.
Espacer les connexions rapprochées pendant la démonstration.

Preuves privées dans `/private/tmp/bx-defense-final-20261007` :

- `lot8-groups-projects-account-summary.json` et manifestes
  `real-groups-projects-*.json` / `real-account-tools-*.json` ;
- `lot8-stripe-acceptance-summary.json` et `lot8-stripe-closure.json` ;
- `real-visitor-*.json`, `real-presence-*.json`, `real-deletion-*.json` ;
- exports `real-dashboard-*.pdf` / `real-dashboard-*.csv`, conservés hors Git.

État de clôture : Web 5181 et backend 18081 actifs ; listener Stripe TEST et capture
SMTP arrêtés ; aucun redémarrage du backend original 8080 commandé par cet audit.
Relancer/configurer les services de
test requis avant une nouvelle recette payante ou un reset email. La recette ne
prouve ni une livraison email externe, ni tous les appareils Safari, ni un réseau
de production, ni la réparation des données originales. PARTENAIRE reste inchangé
en attente de l'arbitrage explicite décrit plus haut.


## 9. Refaire une démonstration complète sans réutiliser des états terminés

Les comptes 25/27 servent à consulter les preuves et reçus existants. Ils sont déjà
membres d'un groupe et participants : ils ne constituent pas un scénario « membre
sans groupe » neuf. Pour une nouvelle répétition intégrale sur la copie, créer un
nouveau compte MEMBRE jetable via l'inscription publique et un nouveau groupe au
nom unique. Conserver les anciens enregistrements ; ne pas réinitialiser leurs
statuts par SQL. Choisir soi-même un mot de passe de démonstration conforme et le
conserver hors du rapport.

1. **Préparer** : environnement identifié, sauvegarde disponible, API saine,
   navigateur en Europe/Brussels, listener Stripe TEST configuré et vrai Web ciblé.
   Garder des fenêtres/profils séparés pour ADMIN, RÉFÉRENT, MEMBRE et VISITEUR.
2. **Structurer** : ADMIN crée le nouveau groupe avec une capacité disponible et
   lui attribue le référent actif. Le nouveau MEMBRE demande à rejoindre ce groupe ;
   le RÉFÉRENT accepte. Une seconde demande jetable permet de montrer le refus.
   Montrer suspension/réactivation sans désactiver le compte global.
3. **Préparer les activités** : le RÉFÉRENT crée une activité gratuite avec une vraie
   image PNG et une heure de début quelques minutes dans le futur, puis la publie.
   Le MEMBRE s'inscrit avant cette heure. Créer séparément l'activité payante TEST,
   avec début et clôture suffisamment éloignés pour respecter les 31 minutes.
4. **Montrer le projet** : le MEMBRE du groupe enregistre un brouillon avec budget,
   prix de participation distinct si payant, capacité et dates futures cohérentes.
   Soumission, demande de correction avec commentaire, rechargement pour montrer
   sa persistance, correction/resoumission, validation RÉFÉRENT puis ADMIN.
   Avant l'approbation ADMIN, vérifier l'absence du catalogue visiteur.
5. **Participer** : un projet gratuit confirme la participation sans paiement.
   Pour le projet ou l'activité payante, utiliser exclusivement une carte Stripe
   TEST. Attendre le webhook et l'état confirmé après F5 ; télécharger le reçu du
   projet. Si une tentative est incertaine, vérifier la session existante côté
   serveur avant toute reprise, sans payer une deuxième fois.
6. **Clôturer l'opérationnel** : lorsque la vraie heure de l'activité gratuite est
   passée, renseigner la présence et clôturer la feuille. Montrer son état en
   lecture seule ; ne pas changer artificiellement l'horloge ou la date en base.
7. **Montrer le suivi** : cloche/notifications et destinations, échange
   MEMBRE–RÉFÉRENT, profil/image, puis dashboard ADMIN et téléchargements PDF/CSV.
   Les transactions Stripe et les déclarations de soutien restent distinctes.
8. **Finir sans perte de données** : conserver les reçus et enregistrements de
   démonstration. Réserver la suppression de compte à un compte jetable sans
   paiement, comme dans la recette validée. Espacer les changements de rôle pour
   respecter la limite de connexion ; aucune désactivation de protection.

Si Stripe ou Internet est indisponible, présenter le parcours gratuit et signaler
clairement que le parcours payant n'est pas validé dans ces conditions. Ne pas
transformer un retour navigateur en confirmation. Le module PARTENAIRE et l'email
externe restent soumis aux limites/arbitrages du rapport, pas réputés corrigés en
évitant leur écran.
