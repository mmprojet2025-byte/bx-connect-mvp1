# BX-Connect - Monitoring et alerting production

Ce document decrit le monitoring minimal P0 pour une premiere exploitation
production. Les outils exacts dependent de l'hebergeur retenu. Eviter une
plateforme complexe au depart : un uptime monitor, des logs centralises et des
alertes fiables suffisent pour ce lot.

## Endpoints a surveiller

### Backend

```text
GET https://api.example.org/actuator/health
```

Attendu :

- HTTP 200 ;
- reponse rapide ;
- pas de details internes exposes publiquement.

### Frontend web

```text
GET https://app.example.org/
```

Attendu :

- HTTP 200 ;
- page servie en HTTPS ;
- certificat TLS valide.

Les domaines ci-dessus sont des placeholders. Remplacer par les domaines reels
de l'hebergeur.

## Request ID

Le backend ajoute un header `X-Request-ID` a chaque reponse.

- Si le client fournit un `X-Request-ID` valide, il est reutilise.
- Sinon, le backend genere un UUID.
- Le request id est ajoute au MDC des logs backend pendant la requete.
- Le MDC est nettoye en fin de requete.

Utiliser ce request id pour relier :

- erreur frontend/mobile ;
- reponse API ;
- log backend ;
- incident utilisateur.

## Seuils d'alerte recommandes

| Signal | Priorite | Seuil | Frequence / cooldown |
| --- | --- | --- | --- |
| Backend indisponible | P0 | 2 a 3 checks consecutifs en echec | Alerte immediate, cooldown 15 min |
| Frontend indisponible | P0 | 2 a 3 checks consecutifs en echec | Alerte immediate, cooldown 15 min |
| Erreurs 5xx backend | P0 | > 5 % sur 5 min | Alerte immediate, cooldown 15 min |
| Latence API | P1 | p95 > 1.5 s sur 10 min | Alerte rapide, cooldown 30 min |
| Disque | P1/P0 | 80 % puis 90 % | P1 a 80 %, P0 a 90 % |
| Certificat TLS | P1/P0 | J-30 puis J-7 | P1 a J-30, P0 a J-7 |
| Backup absent/echec | P0 | aucun backup valide depuis 24 h | Alerte immediate |
| Migration Flyway echouee | P0 | demarrage backend echoue sur Flyway | Alerte immediate |
| Paiement/webhook | P0 | plusieurs echecs en 10 min | Alerte immediate |
| Push notifications | P1 | taux d'echec anormal | Alerte rapide |
| Login echoues | P1/P0 | pic anormal ou compte admin cible | Selon severite |

## Canaux d'alerte

A completer selon l'organisation :

- P0 : canal immediat, par exemple email + Slack/Discord/telephone.
- P1 : email + canal equipe.
- P2 : rapport quotidien ou hebdomadaire.

Chaque alerte doit indiquer :

- composant touche ;
- heure de debut ;
- seuil declenche ;
- request id si disponible ;
- lien vers logs ou dashboard ;
- action attendue.

## Deduplication et bruit

- Grouper les alertes identiques pendant un incident.
- Ajouter un cooldown de 15 a 30 minutes.
- Alerter sur des taux ou checks repetes, pas sur chaque erreur isolee.
- Separer erreurs utilisateur normales et erreurs systeme.
- Ne pas alerter P0 sur un push `DeviceNotRegistered` isole.

## Logs minimum

Backend :

- niveau global `INFO` en production ;
- `WARN`/`ERROR` pour incidents ;
- pas de SQL detaille ;
- pattern incluant `requestId` ;
- ne pas logger `Authorization`, JWT, secrets, payloads paiement complets,
  messages prives ou fichiers uploades.

Retention recommandee :

- logs applicatifs : 30 a 90 jours ;
- audit logs metier : selon politique RGPD ;
- logs incidents paiement : selon obligation fournisseur/comptable.

## Procedure de test d'une alerte

Avant ouverture production :

1. Configurer un check backend sur `/actuator/health`.
2. Configurer un check frontend sur `/`.
3. Simuler une indisponibilite sur un environnement de preproduction.
4. Verifier que l'alerte arrive sur le bon canal.
5. Verifier le cooldown et la deduplication.
6. Documenter le resultat : date, responsable, delai de detection.

Ne pas simuler de panne destructive sur la production sans fenetre de
maintenance et validation humaine.

## Elements dependants de l'hebergeur

- outil d'uptime ;
- centralisation logs ;
- metriques CPU/RAM/disque ;
- monitoring MySQL ;
- monitoring TLS ;
- stockage et statut des backups ;
- canal d'alerte ;
- dashboards ;
- retention des logs.

## A faire dans les lots suivants

- Centraliser les logs backend.
- Ajouter un filtre de masquage des headers sensibles si l'hebergeur logge les
  requetes.
- Activer Sentry web/mobile en production.
- Capturer les erreurs API 5xx cote web/mobile avec le request id.
- Ajouter un suivi dedie des webhooks Stripe/PayPal.
- Ajouter un suivi des echecs de sauvegarde.
