# BX-Connect - Incident response

Ce document definit les reflexes minimum en cas d'incident production. Il doit
etre complete avec les contacts reels, l'hebergeur choisi et les canaux
d'alerte.

## Principes

- Proteger les utilisateurs et les donnees avant de chercher un correctif rapide.
- Eviter les actions irreversibles sans backup.
- Documenter chaque decision.
- Ne jamais partager de secret dans un canal non securise.
- Distinguer rollback applicatif, restauration DB et rotation de secrets.

## Collecte minimale d'informations

Pour tout incident, noter :

- date/heure de debut ;
- composant touche : backend, frontend, mobile, MySQL, paiement, upload ;
- symptomes visibles ;
- taux d'erreurs si disponible ;
- derniere release/tag ;
- migrations Flyway recentes ;
- changements de configuration recents ;
- logs pertinents sans secret ;
- impact utilisateur estime ;
- personne responsable de la coordination.

## Backend indisponible

1. Verifier `/actuator/health`.
2. Verifier processus/container backend.
3. Verifier logs de demarrage.
4. Verifier variables production.
5. Verifier connectivite MySQL.
6. Si la derniere release est suspecte, appliquer la procedure de rollback dans
   [DEPLOYMENT.md](./DEPLOYMENT.md).

Retour a la normale :

- healthcheck `200` stable ;
- login fonctionne ;
- erreurs 5xx revenues au niveau normal.

## Base de donnees inaccessible

1. Verifier disponibilite MySQL.
2. Verifier espace disque.
3. Verifier credentials et reseau.
4. Stopper les deploiements.
5. Ne pas lancer de migration manuelle non validee.
6. Si corruption suspectee, suivre [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

## Migration Flyway echouee

1. Ne pas redemarrer en boucle sans comprendre l'erreur.
2. Identifier la migration en echec.
3. Verifier si des changements partiels ont ete appliques.
4. Restaurer le backup pre-deploiement si necessaire.
5. Corriger par une nouvelle migration uniquement apres analyse.

Ne jamais modifier une migration deja appliquee en production.

## Paiement Stripe/PayPal defaillant

1. Verifier les variables Stripe/PayPal.
2. Verifier les dashboards fournisseur.
3. Verifier les logs webhook/callback.
4. Identifier si l'argent a ete capture, autorise ou refuse.
5. Ne jamais rejouer un paiement sans verification fournisseur.
6. Informer l'association si des utilisateurs sont impactes.

Retour a la normale :

- creation paiement fonctionne ;
- webhook/callback traite correctement ;
- etat soutien/paiement coherent avec le fournisseur.

## Fuite de secret

1. Revoquer le secret expose.
2. Generer un nouveau secret.
3. Deployer la configuration mise a jour.
4. Verifier logs et acces suspects.
5. Si `JWT_SECRET` fuite, forcer la deconnexion des utilisateurs si possible et
   considerer tous les anciens tokens compromis.
6. Documenter l'incident.

Secrets concernes :

- `JWT_SECRET`
- `DB_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_SECRET`
- DSN ou cles de monitoring selon criticite.

## Compte admin compromis

1. Desactiver ou verrouiller le compte.
2. Reinitialiser le mot de passe.
3. Verifier les audit logs super-admin.
4. Revoquer sessions/tokens si possible.
5. Verifier actions recentes : admins crees, statuts changes, paiements,
   messages, exports.
6. Notifier les responsables internes.

## Certificat TLS expire

1. Confirmer l'expiration via navigateur ou outil TLS.
2. Renouveler le certificat via l'hebergeur.
3. Redemarrer/recharger reverse proxy si necessaire.
4. Verifier frontend et API en HTTPS.
5. Mettre en place une alerte d'expiration a J-30/J-7/J-1.

## Sauvegarde echouee

1. Verifier l'erreur de job.
2. Verifier espace disque et acces stockage externe.
3. Relancer un backup manuel controle.
4. Verifier le checksum et la presence hors serveur.
5. Ne pas deployer de migration tant qu'un backup recent valide n'existe pas.

## Escalade

A completer avant production :

- Coordinateur incident :
- Responsable backend :
- Responsable base de donnees :
- Responsable paiement :
- Responsable communication association :
- Contact hebergeur :
- Canal prioritaire :
- Canal secondaire :

## Communication interne

Message interne minimum :

- ce qui est casse ;
- utilisateurs impactes ;
- heure de debut ;
- action en cours ;
- prochain point de situation ;
- demande explicite de ne pas manipuler la production sans coordination.

## Criteres de retour a la normale

- healthcheck OK ;
- logs sans nouvelle erreur critique ;
- DB accessible ;
- paiements coherents ;
- backups repris ;
- smoke tests OK ;
- responsable incident valide la cloture ;
- post-mortem planifie si incident majeur.
