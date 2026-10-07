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
| P1 PARTENAIRE visible | Report MVP2 annoncé, documents MVP1 différents | Décision de périmètre | 4 | Arbitrage demandé ; conserver backend/comptes | README et matrice recette | Décision utilisateur en attente |
| P2 Anciens endpoints groupes | ADMIN traite adhésions, REFERENT crée | Permissions métier | 4 | ADMIN structure, REFERENT seul membres de son groupe | Controller/services | À corriger |
| Ressources archivées | Certaines mutations ne vérifient pas ARCHIVE | Bug produit | 4 | Refus API même accès direct | GroupeService | À corriger |
| P2 Google | Bouton future fonctionnalité | Limite visible | 4 | Présentation non opérationnelle explicite | Login | À clarifier |
| P2 Mes factures | Reçus projets uniquement | Limite fonctionnelle | 4 | Libellés précis, aucun historique unifié | MesFactures | À clarifier |
| P2 Désinscription/remboursement | Désinscription sans remboursement ; charge.refunded vide | Limite financière | 4 | Expliquer et qualifier rapprochement externe ; pas remboursement automatique | InscriptionService/StripeService | Décision nécessaire si automatisation souhaitée |
| P1 Mot de passe oublié | Email désactivé en dev | Configuration | 5 | SMTP contrôlé, tests réception et jeton | Profil dev constaté | Envoi réel non validé |
| P2 Suppression redirige parfois login | Course logout/route privée | Bug navigation intermittent | 5/6 | Cause + test stable sans retries | Échec global puis réussite isolée | À corriger |
| Sessions/navigation voisines | Expiration/F5/historique/notification | Risque à vérifier | 5/8 | Tests contrôles session et destinations | Tests existants partiels | À vérifier |
| API localhost refusée au build | Garde production HTTPS volontaire | Configuration attendue | 5/6 | Conserver garde ; tester env isolé | Build HTTPS réussi | Comportement conforme ; documentation à actualiser |
| Migrations | V1–V14 appliquées | Risque déploiement | 5 | Base vide + restauration copie, pas repair | Audit Flyway + MySQL tests | À confirmer après lots |
| Uploads | Stockage local, distant non validé | Risque exploitation | 5/8 | Sauvegarde, restauration, redémarrage isolé | Catalogues réels sans image cassée | Persistance distante non validée |
| Test apiBaseUrl | .env local contamine cas variable absente | Défaut de test | 6 | Isoler environnement sans affaiblir HTTPS | 133/134 Node | À corriger |
| 3 tests statistiques | Sous-chaîne Soumis ambiguë | Défaut de test | 6 | Sélecteurs exacts, assertions conservées | Strict mode violation FR/NL/EN | À corriger |
| Test projet/groupe | Ancien bouton soumettre ; workflow brouillon | Défaut de test | 6 | Brouillon puis vraie soumission | Bouton actuel Enregistrer le brouillon | À corriger |
| Test accueil/tri | Récentes vs date début | Incohérence vocabulaire/test | 6 | Prochaines activités, tri métier documenté | Audit attendu/reçu | À aligner |
| 3 tests retour login | Mock intercepte /src/api/axios.js | Défaut de test | 6 | Cibler URL backend, session valide | Reproduction interception | À corriger |
| 8 alertes npm | Dépendances vulnérables selon avis | Sécurité à qualifier | 7 | Avis officiels, exposition, versions compatibles | npm audit : 6 high, 2 moderate | Analyse en cours |
| P2 Bundle 2,51 Mo | Imports lourds | Performance | 7 | Mesurer premier chargement, optimisation seulement justifiée | Build initial | À mesurer |
| Internet/Stripe interrompu | Dépendance externe | Limite exploitation | 8 | Vérification démarrage + récupération sûre + secours gratuit | Aucun nouveau paiement réel dans audit | À éprouver |
| Réception authentifiée complète | Audit initial lecture seule et E2E mockés | Risque non vérifié | 8 | Comptes jetables, vrai backend et DB isolée | 886 backend ; 287 E2E pass, 9 fail | À exécuter |
| Safari | Couverture WebKit ciblée seulement | Limite preuve | 8 | Répétition parcours critiques, limites explicites | 27 WebKit réussis initialement | À compléter |
| Preuve upload WebKit | Assertion binaire Playwright multipart échoue dans six cas exploratoires | Risque à qualifier | 6/8 | Vérifier les octets reçus par le vrai backend et conserver les assertions utiles | Première configuration WebKit trop large au lot 3 ; log browser.log conservé | À qualifier, pas présenté comme validé |
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
