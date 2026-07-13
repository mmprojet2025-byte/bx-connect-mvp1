# BX-Connect - Sauvegarde et restauration MySQL

BX-Connect traite des donnees personnelles, des messages, des notifications et
des paiements. Les sauvegardes doivent donc etre automatisees, chiffrees,
testees et stockees hors du serveur principal.

## Strategie recommandee

- Backup complet quotidien.
- Stockage hors serveur principal.
- Chiffrement avant transfert.
- Retention minimale :
  - 7 sauvegardes quotidiennes ;
  - 4 sauvegardes hebdomadaires ;
  - 6 sauvegardes mensuelles.
- Verification d'integrite apres chaque sauvegarde.
- Test mensuel de restauration sur base jetable.
- Backup obligatoire avant chaque deploiement avec migration Flyway.

## Interdiction Git

Ne jamais committer de backup, dump SQL ou archive contenant des donnees.

Le dossier `backups/` est ignore par Git, mais ce dossier local ne doit pas
devenir le stockage de production. Les backups de production doivent etre
deplaces vers un stockage securise hors serveur principal.

## Backup complet

Modele generique a valider selon l'hebergeur :

```bash
mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF \
  -u "$DB_USERNAME" -p "$DB_NAME" > "bxconnect-full-$(date +%Y%m%d-%H%M%S).sql"
```

Variables attendues :

- `DB_USERNAME`
- `DB_NAME`
- mot de passe demande par `mysqldump` ou fourni via mecanisme secret de
  l'hebergeur.

Chiffrer le fichier avant stockage externe. Le choix de l'outil de chiffrement
dependra de l'hebergeur et doit etre confirme avant production.

## Verification du backup

Apres creation :

- verifier que le fichier n'est pas vide ;
- verifier la taille attendue ;
- verifier que la commande a retourne un code de sortie `0` ;
- verifier le checksum ;
- verifier que le fichier chiffre est bien present dans le stockage externe ;
- verifier que le fichier non chiffre local est supprime ou protege selon la
  procedure retenue.

## Restauration sur base vide

Modele generique a valider selon l'hebergeur :

```bash
mysql -u "$DB_ADMIN_USERNAME" -p -e "CREATE DATABASE <restore_db> CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u "$DB_ADMIN_USERNAME" -p "<restore_db>" < bxconnect-full-YYYYMMDD-HHMMSS.sql
```

Ne jamais restaurer directement sur la base de production sans decision
d'incident et backup prealable.

## Restauration apres incident

1. Identifier la cause : corruption, erreur humaine, migration, panne serveur.
2. Stopper les ecritures applicatives si necessaire.
3. Sauvegarder l'etat actuel meme corrompu si possible.
4. Choisir le point de restauration.
5. Restaurer sur une base jetable.
6. Verifier les controles ci-dessous.
7. Basculer vers la base restauree seulement apres validation humaine.

## Verification Flyway

Apres restauration, verifier :

- table `flyway_schema_history` presente ;
- version appliquee coherente ;
- migrations `V1` et `V2` presentes si elles etaient deja appliquees ;
- pas de migration en etat `failed`.

Commande SQL indicative :

```sql
SELECT installed_rank, version, description, type, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

## Demarrage backend apres restauration

Le backend doit demarrer avec :

```text
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=false
```

En production, ne jamais utiliser `ddl-auto=update`.

## Healthcheck

Verifier :

```bash
curl -f https://api.example.org/actuator/health
```

Adapter le domaine a l'hebergement reel.

## Controles metier apres restauration

- Connexion admin.
- Liste utilisateurs.
- Groupes.
- Activites.
- Projets.
- Notifications recentes.
- Messagerie groupe.
- Messagerie metier.
- Soutiens financiers.
- Historique paiements.
- Logs super-admin.

## Test mensuel de restauration

Chaque mois :

1. Selectionner un backup recent.
2. Restaurer sur une base de test isolee.
3. Demarrer le backend contre cette base.
4. Verifier Flyway et `ddl-auto=validate`.
5. Executer les smoke tests.
6. Documenter resultat, date, responsable et anomalies.
