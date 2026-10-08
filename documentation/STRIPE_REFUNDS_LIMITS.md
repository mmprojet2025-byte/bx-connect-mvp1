# Remboursements Stripe : limites et vérification contrôlée

État vérifié le 7 octobre 2026, après le lot 3 (`832d7d1`). Ce document décrit
une limite existante ; il n'ajoute aucun remboursement ni changement de statut.

## Comportement actuel

| Situation | Comportement constaté dans BX-Connect |
| --- | --- |
| Événement `charge.refunded` signé reçu | `StripeService.traiterWebhook` vérifie la signature, puis entre dans une branche vide. Le webhook répond normalement HTTP 200, sans modification financière. |
| Journalisation de cet événement | Aucun log dédié. Le log générique des webhooks signés en échec ne s'exécute pas pour cette branche vide. HTTP 200 prouve la réception, pas le traitement du remboursement. |
| Paiement activité/projet déjà `REMBOURSE` localement | La récupération et le rejeu d'une ancienne confirmation Checkout préservent ce statut. Ils ne recréent pas l'inscription/participation. |
| Remboursement Stripe absent de la base locale | La récupération actuelle vérifie Checkout, mais pas les remboursements de la Charge. Un paiement local peut rester `PAYE`, ou un ancien `EN_ATTENTE` être confirmé alors qu'un remboursement a eu lieu entre-temps. |
| Reçu projet et montants | Le reçu local conserve les données du paiement initial. Il ne contient aucun ajustement pour remboursement externe. L'endpoint de reçu exige actuellement `PAYE` : passer simplement à `REMBOURSE` ferait aussi perdre son accès via cet endpoint. |
| Désinscription d'une activité | Elle n'est pas une instruction de remboursement. Une inscription `ANNULEE` peut légitimement avoir un paiement `PAYE`, état préservé au rejeu. |

Les sources concernées sont `StripeService`, `ActivityPaymentService.applyStripeSession`,
`ProjetParticipationPaiementService.handle` et `receipt`. Les modèles conservent le montant
initial, mais ne portent pas de suivi complet des montants partiellement remboursés et des
identifiants de remboursement.

Stripe émet `charge.refunded` aussi pour les remboursements partiels. Cet événement contient
une Charge, pas un objet Checkout. Les événements de remboursement détaillés ont leur propre
objet et leur propre cycle de vie. [Types d'événements Stripe](https://docs.stripe.com/api/events/types)

Checkout expose `paid`, `unpaid` ou `no_payment_required`, sans état « remboursé ».
Un Checkout `complete/paid` ne suffit donc pas à établir l'absence de remboursement.
[Objet Checkout Session](https://docs.stripe.com/api/checkout/sessions/object)

Sur la Charge, `amount_refunded` indique le montant remboursé ; `refunded=true` signifie
un remboursement total. Un remboursement partiel laisse ce booléen à `false`.
[Objet Charge](https://docs.stripe.com/api/charges/object)

## Preuve disponible et limites

La recette des lots 1 et 3 a relu via l'API Stripe TEST les sept paiements existants ciblés
(deux projets et cinq activités), puis vérifié leur récupération idempotente sur la copie
isolée de MySQL. Le contrôle complémentaire en lecture seule de leurs Charges n'a trouvé
aucun remboursement. Cela qualifie ces sept exemples à l'instant du contrôle, pas un
workflow de remboursement. Aucun remboursement réel ou de test n'a été déclenché pour
cette recette. La base originale n'a pas été réparée.

Deux tests déjà passés dans les suites ciblées du lot 3 prouvent la conservation d'un
remboursement **déjà enregistré localement** :

- `ActivityProviderConfirmationTest.oldSuccessfulSessionDoesNotUndoARecordedRefund` :
  récupération puis webhook tardif, paiement toujours `REMBOURSE`, inscription `ANNULEE`.
- `ProjetParticipationPaiementTest.replayDoesNotReplaceAnAlreadyRecordedRefund` :
  récupération puis confirmation tardive, aucun ajout de participation ou notification.

Ils utilisent des objets fournisseur simulés. Ils ne prouvent ni la réception réelle de
`charge.refunded`, ni la détection d'un remboursement externe inconnu. Le test
`duplicateSuccessNeverReactivatesACancelledPaidRegistration` couvre séparément une
désinscription après paiement ; il ne valide pas un remboursement.

## Vérification en lecture seule avant récupération

1. Identifier le backend, la base, le paiement local, son propriétaire et sa session stockée.
   Pour la recette, utiliser exclusivement la copie isolée et le compte Stripe TEST attendu.
   Vérifier le compte et `livemode=false`. Ne jamais essayer une session arbitraire.
2. Utiliser l'authentification serveur déjà configurée, en mémoire. Ne pas afficher la clé,
   la placer dans une commande conservée dans l'historique, ni enregistrer les réponses
   complètes : elles peuvent contenir données personnelles et secrets client.
3. Lire la session connue puis son PaymentIntent et sa Charge associée, par exemple :

   ```text
   GET /v1/checkout/sessions/{session_connue}?expand[]=payment_intent.latest_charge
   GET /v1/payment_intents/{intent_associe}?expand[]=latest_charge
   GET /v1/charges/{charge_associee}
   GET /v1/refunds?payment_intent={intent_associe}&limit=100
   ```

   Le PaymentIntent expose `latest_charge`, relation à comparer avec la Charge consultée.
   [Objet PaymentIntent](https://docs.stripe.com/api/payment_intents/object)
   La liste des remboursements accepte le filtre `payment_intent`. Paginer avec
   `starting_after` tant que `has_more=true` ; une liste embarquée partielle ne suffit pas.
   [Liste des remboursements](https://docs.stripe.com/api/refunds/list)
4. Comparer session, référence locale, activité/projet, montant en centimes, devise et
   PaymentIntent avec les données locales. Examiner `amount_refunded`, `refunded` et
   les statuts des remboursements. Distinguer notamment remboursement réussi, en attente
   et échoué. [Objet Refund](https://docs.stripe.com/api/refunds/object)
5. Ne conserver hors Git qu'une synthèse contrôlée : identifiant local, ressource,
   statuts local/Stripe, montant/devise, montant remboursé, résultat et horodatage.
   Exclure nom, email, données de carte, URL de reçu privée, payload, signature et credentials.

Si un remboursement existe, ou si sa situation reste incertaine, **ne pas lancer la
récupération actuelle ni rejouer une confirmation Checkout**. Consigner le dossier,
faire vérifier les preuves Stripe et demander une décision métier. Ne pas recréer un
paiement, ne pas appeler une API de création de remboursement et ne pas forcer `PAYE`
ou `REMBOURSE` en SQL. Toute réparation future de la base originale requiert une
autorisation distincte, une sauvegarde et une procédure d'abord vérifiée sur la copie.

## Traitement minimal à décider avant toute automatisation

La correction financière future doit conserver la vérification de signature et les
contrôles de référence, montant, devise, propriétaire et compte Stripe. Un événement
doit être rattaché au paiement local exact via sa Charge/son PaymentIntent, puis vérifié
côté serveur. Une éventuelle incompatibilité de version SDK doit relire l'objet Stripe
authentifié, sans faire confiance à des valeurs fournies par le navigateur.

Les décisions suivantes restent nécessaires :

- **Total ou partiel :** réserver `REMBOURSE` au cas défini par le métier ; ne pas assimiler
  tout événement `charge.refunded` à un remboursement total. Conserver le montant initial,
  distinguer encaissé brut, remboursé et net, sans traiter un remboursement en attente ou
  échoué comme définitivement réussi. Cela peut nécessiter des champs dédiés dans un lot séparé.
- **Inscription/participation :** décider si un remboursement annule la participation,
  libère une place ou préserve l'historique. Ne pas déduire cette décision du seul statut
  financier, notamment après une activité terminée ou une présence enregistrée.
- **Reçu :** conserver la preuve du paiement d'origine et définir l'accès à une preuve
  de remboursement/rectification. Ne pas réécrire silencieusement le reçu initial.
- **Idempotence :** traiter les remboursements sous transaction, identifier chaque
  remboursement fournisseur et vérifier les cumuls. Couvrir doublons, événements retardés,
  partiels successifs et confirmation Checkout reçue après remboursement.
- **Visibilité :** prévoir un journal contrôlé contenant type/identifiant d'événement,
  identifiant local et résultat, sans données sensibles. Un log de réception seul ne
  constitue pas le traitement métier manquant.

Les tests futurs devront couvrir ces décisions avant activation. Aucun traitement
automatique, scheduler, endpoint de remboursement ou changement de base n'est ajouté
par ce document. Le suivi manuel décrit ci-dessus sert à identifier et isoler les cas,
pas à masquer la limite actuelle du produit.
