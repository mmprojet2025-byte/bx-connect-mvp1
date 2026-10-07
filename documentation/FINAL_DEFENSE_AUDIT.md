# Réception finale BX-Connect — 7 octobre 2026

Référence : `test-final-defense-2026`, `0f1fc91`, tag `backup-before-final-audit-20261007`.
Travail progressif en huit lots avec commits locaux uniquement. Aucun push/merge ni mobile.
Base originale : aucune reprise autorisée à ce stade. Les tests utilisent des bases isolées.

## Suivi exhaustif de l’audit

| Point | Cause | Nature | Lot | Correction / traitement prévu | Preuve | Statut |
|---|---|---|---|---|---|---|
| P0 Paiements projets 100/60 EUR | Sessions paid/complete, état local EN_ATTENTE | Données / livraison historique non attribuée | 1 | Récupération serveur existante sur copie ; reprise originale préparée | Audit Stripe GET + SELECT ; deux participations/reçus absents | Validé sur copie : PAYE, une participation et un reçu par projet ; original en attente d’autorisation |
| P0 Cinq paiements activités bloqués | Webhooks manqués/non appliqués ; absence de récupération activités | Données + robustesse | 1 | Confirmation partagée avec webhook, vérification serveur sûre | Audit sessions paid/complete et inscriptions en attente | Corrigé/testé : 117 tests et récupération réelle des cinq sessions sur copie |
| P0 Livraison locale Stripe | Listener absent pendant audit, cause historique non prouvée | Configuration | 1/8 | Identifier compte/mode/backend/secret/base ; vérifier livraison et effets | Audit processus uniquement, pas historique HTTP | Non validé |
| P1 Changement référent | Deux responsabilités persistées désalignées | Bug produit + données | 2 | Cohérence atomique, auteur préservé, droits API | Activités 2/3 groupe 1 ; accès contradictoires | Corrigé : 235 tests ciblés ; reprise des deux activités validée sur copie ; original non repris |
| P1 PAYE sans checkoutUrl | Frontend exige encore URL | Bug produit | 3 | Confirmation backend reconnue, compteurs rechargés | Tests Chromium/WebKit et sept reprises API sur copie | Corrigé |
| P1 Clôture Stripe 31 min | Backend et UI non alignés | Bug produit | 3 | Horloge serveur, échéance UTC fournie au Web, Europe/Brussels | Bornes 1859/1860/1861 secondes et +1 ms, hiver/été/DST, Web Bruxelles/New York | Corrigé, délai inchangé |
| Risque ancienne URL activité | URL réutilisée sans vérifier session | Bug produit | 3 | URL seulement pour session open/unpaid vérifiée ; recontrôle avant reprise | Tests reprise/expiration/erreur/double clic | Corrigé |
| Risque réservations bloquées | Expiration non reçue / tentative sans session | Robustesse | 3 | Récupération propriétaire + réconciliation bornée avant Checkout, preuve Stripe obligatoire | Tests MySQL expiration/capacité/concurrence et idempotence réseau | Corrigé pour sessions identifiées ; absence de session reste bloquée par sécurité ; pas de scheduler implicite |
| P1 PARTENAIRE visible | Report MVP2 annoncé, documents MVP1 différents | Décision de périmètre | 4 | Arbitrage demandé ; conserver backend/comptes | README et matrice recette | Bloqué sur arbitrage utilisateur ; aucune modification PARTENAIRE |
| P2 Anciens endpoints groupes | ADMIN traite adhésions, REFERENT crée | Permissions métier | 4 | Création legacy alias ADMIN du service canonique ; décisions REFERENT propre groupe en API et service | Matrice API/MySQL, suites voisines | Corrigé |
| Ressources archivées | Certaines mutations ne vérifient pas ARCHIVE | Bug produit | 4 | PUT, réaffectation et changement d’adhésion refusés ; historique conservé | Tests permissions/MySQL et contrôles UI | Corrigé |
| P2 Google | Bouton future fonctionnalité | Limite visible | 4 | Bouton désactivé avec libellé futur FR/NL/EN | Chromium/WebKit, aucun appel auth | Limite explicitée |
| P2 Mes factures | Reçus projets uniquement | Limite fonctionnelle | 4 | Titre et description explicitement projets ; navigation conservée | Chromium/WebKit FR/NL/EN, reçu PDF voisin | Limite explicitée |
| P2 Désinscription/remboursement | Désinscription sans remboursement ; charge.refunded vide | Limite financière | 4 | Message avant désinscription payée, qualification des remboursements externes dans STRIPE_REFUNDS_LIMITS.md | UI FR/NL/EN + lecture code/API Stripe ; aucun remboursement déclenché | Limite explicitée ; rapprochement automatique non réalisé, décision métier nécessaire |
| P1 Mot de passe oublié | Email désactivé en dev | Configuration | 5 | SMTP contrôlé, tests réception et jeton | 23 assertions sur API + SMTP local contrôlé, lien Web réel | Validé sur capture SMTP locale ; fournisseur/boîte distante non validés, dev original désactivé |
| Risque énumération temporelle email | Envoi SMTP synchrone pour compte connu | Risque sécurité préexistant | 5 | Contenu public neutre conservé ; qualifier le délai, pas de refonte auth | Capture locale : réponse identique, latence liée au SMTP pour compte connu | Limite identifiée, pas de garantie temporelle ; production non certifiée |
| P2 Suppression redirige parfois login | Course logout/route privée | Bug navigation intermittent | 5/6 | Cause + test stable sans retries | Course session/route corrigée ; trois répétitions Chromium et WebKit, F5 et historique | Corrigé, sans retries |
| Sessions/navigation voisines | Expiration/F5/historique/notification | Risque à vérifier | 5/8 | Tests contrôles session et destinations | 30 tests Chromium/WebKit + 13 voisins + 26 Node, lot 5 | Corrigé/testé avec API simulées ; répétition réelle lot 8 à suivre |
| API localhost refusée au build | Garde production HTTPS volontaire | Configuration attendue | 5/6 | Conserver garde ; tester env isolé | Build HTTPS réussi ; variables/profils documentés dans DEFENSE_RUNBOOK.md | Conforme ; test isolé à corriger lot 6 |
| Migrations | V1–V14 appliquées | Risque déploiement | 5 | Base vide + restauration copie, pas repair | Base vide V1–V14, schémas V7/V8→V14, clone restauré validé ; aucun SQL modifié | Validé localement, aucun repair ni migration originale |
| Uploads | Stockage local, distant non validé | Risque exploitation | 5/8 | Sauvegarde, restauration, redémarrage isolé | 29 assertions réelles API/Chromium/WebKit + SHA256 après restart du clone | Validé localement ; persistance distante non validée |
| Test apiBaseUrl | .env local contamine cas variable absente | Défaut de test | 6 | Isoler environnement sans affaiblir HTTPS | 138/138 Node après isolation explicite de VITE_API_BASE_URL | Corrigé |
| 3 tests statistiques | Sous-chaîne Soumis ambiguë | Défaut de test | 6 | Sélecteurs exacts, assertions conservées | Sélecteurs rowheader exacts FR/NL/EN ; toutes les valeurs/statuts conservés | Corrigé |
| Test projet/groupe | Ancien bouton soumettre ; workflow brouillon | Défaut de test | 6 | Brouillon puis vraie soumission | POST BROUILLON, groupe actif, puis PATCH SOUMIS et disparition du bouton vérifiés | Corrigé |
| Test accueil/tri | Récentes vs date début | Incohérence vocabulaire/test | 6 | Prochaines activités, tri métier documenté | Horloge fixe, filtre PUBLIC/PUBLIEE/futur, tri début/id et limite 3 FR/NL/EN | Corrigé : Activités à venir, tri inchangé |
| 3 tests retour login | Mock intercepte /src/api/axios.js | Défaut de test | 6 | Cibler URL backend, session valide | Interception API précise, JWT valide, destination et F5 vérifiés | Corrigé |
| 8 alertes npm | Dépendances vulnérables selon avis | Sécurité à qualifier | 7 | Avis officiels, exposition, versions compatibles | Huit chemins/avis qualifiés ; 17 versions compatibles ; npm audit 0 après npm ci | Corrigé ; node_modules original à réinstaller au prochain démarrage |
| P2 Bundle 2,51 Mo | Imports lourds | Performance | 7 | Mesurer premier chargement, optimisation seulement justifiée | FCP médian local 173–492 ms selon parcours/moteur ; ~706 Ko JS preview initial | Limite expliquée : poids élevé, pas de blocage local mesuré ; distant non validé |
| Internet/Stripe interrompu | Dépendance externe | Limite exploitation | 8 | Vérification démarrage + récupération sûre + secours gratuit | Aucun nouveau paiement réel dans audit | À éprouver |
| Réception authentifiée complète | Audit initial lecture seule et E2E mockés | Risque non vérifié | 8 | Comptes jetables, vrai backend et DB isolée | 886 backend ; 287 E2E pass, 9 fail | À exécuter |
| Safari | Couverture WebKit ciblée seulement | Limite preuve | 8 | Répétition parcours critiques, limites explicites | 27 WebKit réussis initialement | À compléter |
| Preuve upload WebKit | Assertion binaire Playwright multipart échoue dans six cas exploratoires | Risque à qualifier | 6/8 | Vérifier les octets reçus par le vrai backend et conserver les assertions utiles | Upload réel WebKit FR réussi avec octets source/aperçu/disque/HTTP identiques au lot 5 | Corrigé : six tests WebKit vérifient les octets réellement reçus, sans supprimer les assertions |
| Secrets / production | Scan motifs limité ; prod non auditée | Risque non vérifié | 5/7/8 | Secrets hors Git, profil/env, scan final | Aucun motif apparent audit initial | Pas certification production |
| Soutiens vs transactions | Séparation implémentée à conserver | Non-régression | 3/8 | Tests scope DECLARATION, permissions et compteurs | Tests initiaux réussis | À préserver |
| Notifications / messagerie / profil / PDF CSV | Parcours voisins | Non-régression | 5/8 | Vérifications simulées et réelles distinguées | Couverture initiale existante | À préserver/valider |

## Lots, commits et preuves

Les résultats sont consignés à mesure de leur exécution. Une lecture ne constitue pas un test.
Les copies et sauvegardes contenant des données ou secrets restent hors Git.

## Reprise de la base originale

Interdite sans validation explicite. Préparer une liste des paiements/sessions/ressources,
comparer montant/devise/propriétaire et effectuer les opérations métier, jamais un UPDATE PAYE.
Même règle pour la réparation des affectations historiques.

### Lot 1 — livraison et récupération Stripe

Sauvegarde hors Git : `/Users/Malaba/BX-Connect-backups/20261007-final-defense/`,
archives MySQL/uploads contrôlées et sommes SHA-256. Restauration Docker MySQL 8
sur 127.0.0.1:13316 : 25 tables, V1–V14 réussies. Aucun changement dans la base originale.
Backend de réception isolé : 18081 ; base `defense_copy` ; comptes clones avec adresses
`@defense.invalid` et mots de passe jetables hors Git ; emails désactivés et appareils push
désactivés dans la copie seulement.

Correction : POST de récupération activités propriétaire, session Stripe existante vérifiée,
confirmation métier partagée avec le webhook et mêmes verrous. GET retour navigateur inchangé,
sans mutation. Contrôles session/référence/montant/devise/mode/propriétaire/inscription.
PAYE et REMBOURSE ne sont pas écrasés par événements obsolètes ; doublon PAYE ne réactive pas
une inscription annulée volontairement. Aucun reçu activité inventé.

Tests : 117 réussis, zéro échec/erreur/ignoré :
`./mvnw -Dtest=ActivityProviderConfirmationTest,ActivityPaymentStateTest,ActivityPaymentPolicyTest,StripeSessionSecurityTest,ActivityRecoveryEndpointTest,ActivityStripeRecoveryMySqlTest,ProjetParticipationPaiementTest,ProjetStripeCheckoutTest,ProjetPaiementMySqlTest test`.
Concurrence MySQL récupération/webhook incluse.

Réception réelle sur copie : GET auprès de Stripe TEST des sept sessions, rapprochement
référence/session/montant/devise/ressource/propriétaire, connexion API des comptes clones,
deux POST de récupération par paiement. Projets 1/2 : PAYE, une participation chacun,
reçus BX-PROJET-1/2. Activités 2/3/4/7/8 : PAYE et inscriptions PAYEE.
Nombre de paiements inchangé (2 projets, 8 soutiens/transactions). Inscription déjà annulée
du paiement activité 1 conservée ANNULEE. Aucun Checkout ni débit créé.

Livraison Stripe CLI réelle encore à vérifier au lot 8. L'absence du listener pendant
l'audit n'est pas une preuve de la cause historique de chaque incident.
Reprise originale : PRÉPARÉE, NON EXÉCUTÉE ; voir STRIPE_RECOVERY_RUNBOOK.md.

### Lot 2 — responsabilité groupe / activités

Réaffectation ADMIN du groupe et de toutes ses activités dans une transaction.
Auteur historique et statuts inchangés. Verrous ordonnés groupe puis activité,
contrôle d’un changement concurrent et refus de réaffecter un groupe archivé.
235 tests ciblés réussis dans les derniers rapports des classes : 226 tests voisins
plus neuf nouveaux cas API/MySQL (droits, historique, rollback, concurrence).
La première passe a révélé une fixture du nouveau test qui envoyait explicitement
une désaffectation `referentAssigneId:null` ; corrigée pour reproduire le payload Web.
Relance des neuf cas : zéro échec/erreur/ignoré. Logs hors Git :
`/tmp/bx-lot2-tests.log`, `/tmp/bx-lot2-recheck.log`.

Réception sur copie réelle : connexion ADMIN puis deux appels PATCH de réaffectation
du groupe 1 au référent 8. Activités 2/3 réalignées, auteurs et états conservés,
zéro désalignement restant et zéro duplication. Base originale inchangée.
Procédure de reprise soumise à autorisation : `GROUP_REFERENT_REPAIR.md`.

### Lot 3 — états, reprise et bornes des paiements

PAYE sans URL confirme l’état depuis le serveur. Une URL de reprise n’est fournie
qu’après vérification de la session Stripe open/unpaid/non expirée. Le bouton
Vérifier peut récupérer une confirmation perdue ; le polling GET ne confirme rien.
Paiement confirmé et inscription annulée restent deux états distincts dans l’interface.
Le retour « annulation » du navigateur n’affirme plus l’absence de débit.

Fenêtre activités : 31 minutes conservées, Clock injectable et dates Europe/Brussels,
instant de clôture partagé avec le Web. Expiration prouvée par Stripe libère la place ;
incertitude ou absence de session ne la libère jamais arbitrairement. Les tentatives
réseau réutilisent la clé d’idempotence et les paramètres existants. Reprise bornée
à 20 sessions anciennes avant un Checkout ; aucun job activé sur la base originale.
Sans livraison des expirations et sans action de récupération, une réservation peut
encore attendre une vérification : laisser le listener actif pendant la démonstration.
Une tentative trop ancienne sans identifiant Stripe nécessite un rapprochement
contrôlé ; le produit interdit de la remplacer aveuglément par un nouveau débit.

Tests frontend : 86 réussis, zéro échec, deux ignorés (cas clavier natif WebKit
exclus de Chromium par condition préexistante), plus trois tests JS du helper.
Nouveaux cas Chromium/WebKit avec API simulées : 34/34 ; voisins : 52 réussis.
ESLint ciblé et diff-check réussis. Preuves hors Git dans
`bx-lot3-frontend-9nrp9722/browser-safety-final.log` et `browser-neighbours-final.log`.
Six assertions d’upload dans une première sélection WebKit trop large restent
à qualifier au lot 6/8 ; aucune assertion utile supprimée et aucun succès inventé.

Réception API réelle sur copie après recompilation : les sept récupérations retournent
PAYE sans checkoutUrl ; inscriptions activités PAYEE. Le paiement activité 1 conserve
son inscription ANNULEE. Nombres de paiements, inscriptions et participations inchangés.
Lecture Stripe supplémentaire : PaymentIntents succeeded, débits payés, aucun
remboursement parmi ces sept paiements. Aucun nouveau Checkout ou débit.

Tests backend du lot 3 : 325 cas distincts réussis, zéro échec/erreur/ignoré
(321 paiements et voisins, trois cas d’orchestration supplémentaires et un cas
projet REMBOURSE). Commande principale :
`./mvnw -Dtest=ActivityCheckoutWindowTest,ActivityProviderConfirmationTest,ActivityPaymentStateTest,ActivityPaymentPolicyTest,StripeSessionSecurityTest,ActivityRecoveryEndpointTest,ActivityStripeRecoveryMySqlTest,ProjetParticipationPaiementTest,ProjetStripeCheckoutTest,ProjetPaiementMySqlTest,ActiviteWriteRulesTest,ActiviteInvariantTest,ActiviteVisibilityTest,ActiviteSecurityTest,ActiviteEndpointSecurityTest,ActiviteWriteRulesMySqlTest,ActiviteParticipationMySqlTest test`.
Compléments : `./mvnw -Dtest=ActivityCheckoutOrchestrationTest,ActivityProviderConfirmationTest,StripeSessionSecurityTest test`, puis `./mvnw -Dtest=ProjetParticipationPaiementTest test`.
Journaux hors Git : `bx-lot3-payments-psvmbn10/lot3-tests.log`,
`lot3-orchestration.log`, `lot3-project-regression-final.log`.

Préparation de réception Stripe : aucun listener actif et aucun endpoint webhook
TEST enregistré lors du contrôle. La future livraison sera limitée au backend isolé.

### Lot 4 — permissions et périmètre visible

POST `/api/groupes` réutilise désormais la création ADMIN canonique (même DTO
avec référent actif obligatoire, même service). Les anciennes décisions d’adhésion
sont réservées au référent du groupe, contrôlé aussi dans le service. Les ressources
archivées restent consultables mais ne peuvent être modifiées/réaffectées ; leur
historique d’adhésion est conservé. Les sélecteurs ADMIN reflètent ce refus.

Google : contrôle désactivé et futur annoncé avant clic. Factures : titre et contenu
explicitement limités aux projets ; aucun nouvel historique ajouté. Désinscription
payée : absence de remboursement automatique annoncée avant action. Tous en FR/NL/EN.

Tests backend : 351 réussis, zéro échec/erreur/ignoré, avec matrice de permissions
API/MySQL et suites Groupes/Activités voisines. Tests UI limites/paiements/navigation :
172/172 Chromium et WebKit, API simulées, zéro ignoré. ESLint ciblé réussi.
Commande UI dans copie temporaire :
`npx playwright test --config playwright.audit.config.js mvp-boundaries.spec.js project-payments.spec.js admin-navigation.spec.js`.
Journal : `/private/tmp/bx-lot4-web-tests.log`.

PARTENAIRE : aucune modification, arbitrage demandé. README et matrice de recette
incluent encore le module dans MVP1, décision de conversation contraire ; les mécanismes
de masquage ne sont pas appliqués sans résolution de cette contradiction.

Remboursements : `charge.refunded` reste sans traitement, HTTP 200 ne prouve pas le
rapprochement. La garde REMBOURSE protège seulement un état déjà connu localement.
Le document `STRIPE_REFUNDS_LIMITS.md` détaille les contrôles en lecture seule et les
décisions nécessaires pour les remboursements partiels/totaux, la participation et le
reçu. Aucun remboursement ni rapprochement automatique inventé.

Commits locaux déjà créés : lot 1 `3a39eb4`, lot 2 `a87c8b2`, lot 3 `832d7d1`.

Complément lot 4 Groupes : 11 tests Chromium et 11 WebKit réussis ; le seul ancien
test projet/groupe défaillant est explicitement laissé au lot 6, aucune assertion
supprimée. Maven : `./mvnw '-Dtest=Groupe*Test,Activite*Test,InscriptionLifecycleMySqlTest' test`.
Logs : `/tmp/bx-lot4-groups-maven.log`, `/tmp/bx-lot4-groups-browser.log`,
`/tmp/bx-lot4-groups-webkit.log`. Total navigateur ciblé lot 4 : 194 réussis.


### Lot 5 — session, navigation et environnement

La mise à jour de session et la navigation sont regroupées dans une transition React
après login/inscription et après suppression réussie. Une suppression échouée conserve
la session. Le retour depuis un projet public rejoint la fiche sélectionnée après
connexion, sans participation automatique. Une notification vers un groupe indisponible
propose le catalogue de groupes, sans dépendre de la page précédente.

Tests : 30/30 Chromium/WebKit dans `session-navigation.spec.js`, sans retries ;
13/13 voisins dans `account-deletion.spec.js` et `authenticated-home.spec.js`.
Les API de ces tests navigateur sont simulées. Trois répétitions de la suppression
par moteur couvrent F5, historique, session effacée et refus d’une route privée.
26/26 tests Node : `node --test src/routes/postAuthReturn.test.js src/pages/profil/accountDeletion.test.js src/context/restoreSession.test.js src/context/logoutSession.test.js src/api/sessionPolicy.test.js src/utils/notificationRoute.test.js`.
ESLint ciblé et `git diff --check` réussis. Journaux privés :
`bx-lot5-frontend-czc_olqs/frontend-web/lot5-browser.log` et `lot5-neighbours.log`.

Email : deux scénarios réels sur le backend 18081 et un récepteur SMTP local contrôlé
11025, comptes jetables seulement. 23 assertions réussies (13 succès et usage unique,
10 expiration). Lien Web 5181 accessible, mot de passe remplacé, ancien mot de passe et
ancien JWT refusés. Adresse inconnue : même réponse publique, aucun email envoyé.
Le test de succès utilise un TTL de cinq minutes ; celui d’expiration, vingt secondes.
Configuration normale de la copie restaurée ensuite : email désactivé, TTL 15 minutes.
Aucun email vers les comptes originaux, aucune livraison sur une boîte distante validée.
L’envoi est synchrone : les délais connu/inconnu peuvent différer. La neutralité du
contenu est prouvée, pas une résistance à l’énumération temporelle. Ce risque résiduel
est distinct de la configuration SMTP absente du processus original.

Migrations : inventaire V1–V14 unique et inchangé depuis `0f1fc91`. Application sur
base vide MySQL, montée des fixtures V7/V8 et validation du clone restauré prouvées.
Le runbook distingue ces preuves d’une migration distante non exécutée. Il documente
les ports, variables, garde HTTPS, fuseau Europe/Brussels, services et limites SMTP/uploads.

Uploads : 29 assertions réussies sur la copie (API 4, Chromium 8, WebKit 8,
persistance après redémarrage 9). Trois vrais uploads PNG par ADMIN, sans mocks,
aperçus décodés et SHA256 identique à la source, au GET HTTP et au fichier stocké.
Après redémarrage de 18081, les trois URLs renvoient encore exactement les mêmes octets.
8080 inchangé. Cette preuve couvre le stockage local, pas un hébergement distant.
Le cas réel WebKit FR ne remplace pas les six assertions exploratoires d’instrumentation
multipart à qualifier au lot 6. Preuves privées : `lot5-upload-proof-private.json`
et `lot5-real-browser-upload-private.json`.


### Lot 6 — tests frontend fiables

79 tests navigateur réussis, zéro échec et deux ignorés préexistants : les deux cas
clavier natif WebKit ne s’exécutent pas dans Chromium. Les six uploads multilingues
ADMIN/RÉFÉRENT WebKit passent avec un récepteur HTTP local qui vérifie les octets
réellement envoyés. La réponse métier de ces tests reste simulée ; la preuve backend
réelle distincte figure au lot 5. La couverture WebKit est ajoutée au projet Playwright
permanent. Aucune augmentation de retries, aucune assertion binaire supprimée.

Les neuf échecs navigateur initiaux sont traités : course de suppression corrigée
au lot 5 ; trois sélecteurs de statistiques exacts ; brouillon puis soumission depuis
le groupe actif ; tri des prochaines activités et FR/NL/EN cohérents ; trois mocks
de retour connexion limités à l’API, sans bloquer les modules Vite.

`npm test` : 138/138, zéro échec/ignoré. ESLint global et build réussis. La valeur
VITE_API_BASE_URL vide est explicite dans le test d’absence de configuration, pour
empêcher le chargement du .env local. Les contrôles HTTPS/non-localhost sont conservés.
Sentry est désactivé uniquement dans les sous-processus de build des tests.
Le build utilise une URL HTTPS de préproduction : preuve de compilation seulement,
pas preuve de déploiement ni de disponibilité du service distant.

Commande navigateur :
`npx playwright test e2e/account-deletion.spec.js e2e/admin-dashboard.spec.js e2e/group-workflow.spec.js e2e/home-activities-state.spec.js e2e/post-auth-return.spec.js e2e/activity-finalization.spec.js --config=playwright.lot6.config.js --project=chromium --project=webkit-activity-uploads`.
Configuration temporaire : copie et serveur local 5191, arrêté après les tests.
Logs privés : `bx-lot6-frontend-p0t_9noz/frontend-web/lot6-browser.log`,
`lot6-node.log`, `lot6-lint.log`, `lot6-build.log`. Relecture indépendante du diff :
aucune assertion métier affaiblie. `git diff --check` réussi.

Commits locaux supplémentaires : lot 4 `ce35c65`, lot 5 `fa2bb45`.


### Lot 7 — dépendances et poids du chargement

Huit dépendances alertées analysées dans `SECURITY_DEPENDENCY_REVIEW.md` : version,
chemin, avis officiels et exposition navigateur/outillage. Mise à jour ciblée de
17 versions dans les plages existantes, aucun ajout/suppression ni changement majeur.
`package.json` inchangé. Installation indépendante via `npm ci --ignore-scripts`.
`npm audit --json` : zéro alerte ; `npm ls` : arbre cohérent. 138/138 tests Node,
lint et build réussis, 45/45 tests navigateur ciblés sans échec/ignoré/retry
(sessions, uploads Chromium/WebKit, PDF/CSV FR/NL/EN). Diff-check réussi.

Preuves privées : `/private/tmp/bx-final-frontend-nb32ghns/frontend-web/lot7-*.log`
et `lot7-audit.json`. Cette copie sera utilisée pour la suite complète, port 5192,
API explicitement 18081. L’installation originale et le serveur 5173 restent inchangés ;
installer le lockfile validé avant leur prochain démarrage.

Poids : mesure initiale sur cinq contextes neufs par moteur/parcours ; médianes FCP
locales de 173 à 492 ms suivant le contexte. Build final : chunk principal 2520,12 Ko,
715,14 Ko gzip. Limite expliquée, aucune refonte du chargement ; réseau distant lent
non validé. Les mesures initiales ne sont pas une comparaison avant/après des patches.
Lot 6 enregistré localement dans `8d05ec4`.
