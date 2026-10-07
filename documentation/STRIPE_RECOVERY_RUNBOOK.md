# Reprise ciblée des paiements Stripe déjà effectués

## Garde-fous

Aucune commande de ce document ne doit être lancée sur la base originale sans autorisation
explicite. Ne pas créer un nouveau paiement, ne pas utiliser `stripe trigger`, ne pas
forcer PAYE en SQL. Ne jamais publier payloads complets, tokens ou secrets.

Avant reprise : identifier branche/commit/backend/base, faire et vérifier sauvegardes
MySQL + uploads hors Git, vérifier compte Stripe et `livemode=false`. Le secret du listener
doit correspondre au backend ciblé ; ne pas confondre listener local et endpoint hébergé.

## Livraison locale pour les nouveaux événements TEST

Démarrer Stripe CLI avec le compte TEST retenu :

```sh
stripe listen --events checkout.session.completed,checkout.session.expired --forward-to http://localhost:18081/api/stripe/webhook
```

18081 désigne ici le backend **isolé**. Fournir hors Git son `STRIPE_WEBHOOK_SECRET`, puis
redémarrer uniquement ce backend si nécessaire. Ne pas publier le secret affiché par CLI.
Une livraison HTTP 200 doit être suivie d'un SELECT des effets métier. Démarrer le listener
ne répare pas automatiquement les anciens paiements.

## Récupération des anciens paiements

Préparer un manifeste privé : type, identifiant local, session Stripe stockée, propriétaire,
activité/projet, montant, devise, statut initial. Lire la session Stripe dans le même compte
et comparer les références ; n'utiliser que les sessions réellement associées.

Après connexion du MEMBRE propriétaire au backend identifié :
- projet : `POST /api/projets-paiements/{id}/verifier` ;
- activité : `POST /api/stripe/activites/paiements/{id}/verifier`.

Ces endpoints relisent Stripe côté serveur et utilisent la confirmation métier du webhook.
Une session non payée ne doit pas être déclarée PAYE. Session absente/incohérente : arrêter
l'opération concernée et conserver les éléments pour investigation, jamais refaire payer.
Un remboursement externe demande un contrôle séparé : Checkout peut rester paid après remboursement.

Après chaque opération : comparer les identifiants, paiement PAYE, inscription PAYEE
(ou annulation légitime antérieure à préserver), participation unique pour un projet,
numéro de reçu unique lorsqu'il est prévu. Répéter la vérification : mêmes enregistrements.
Comparer les nombres de paiements avant/après. Consigner résultat et heure sans donnée sensible.

## État au lot 1

Les deux paiements projets 1/2 et cinq paiements activités 2/3/4/7/8 ont été récupérés
deux fois avec le vrai backend et l'API Stripe TEST sur une copie Docker. Aucun doublon.
La base originale n'a pas été réparée. Le manifeste et les sauvegardes restent hors Git.
