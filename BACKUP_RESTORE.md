# BX-Connect - Sauvegarde et restauration MySQL

BX-Connect traite des donnees personnelles, des messages, des notifications et
des paiements. Les sauvegardes doivent donc etre automatisees, chiffrees,
testees et stockees hors du serveur principal.

Ce document decrit la procedure portable disponible dans le repo. Elle ne
remplace pas un backup manage par l'hebergeur : elle donne une base minimale,
verifiable et reutilisable avant ouverture aux utilisateurs.

## Strategie recommandee

- Backup complet quotidien.
- Backup obligatoire avant chaque deploiement avec migration Flyway.
- Stockage hors serveur principal.
- Chiffrement avant transfert vers le stockage externe.
- Retention minimale :
  - 7 sauvegardes quotidiennes ;
  - 4 sauvegardes hebdomadaires ;
  - 6 sauvegardes mensuelles.
- Verification d'integrite apres chaque sauvegarde.
- Test mensuel de restauration sur base jetable.

## Interdiction Git

Ne jamais committer de backup, dump SQL ou archive contenant des donnees.

Le dossier `backups/` est ignore par Git, mais ce dossier local ne doit pas
devenir le stockage de production. Les backups de production doivent etre
deplaces vers un stockage securise hors serveur principal.

## Scripts disponibles

Deux scripts sont fournis :

- `scripts/backup-mysql.sh` : cree un backup MySQL compresse.
- `scripts/test-restore-mysql.sh` : restaure un backup dans une base jetable,
  verifie Flyway puis demarre le backend avec `ddl-auto=validate`.

Ces scripts utilisent `set -euo pipefail`, ne contiennent aucune vraie valeur,
appliquent `umask 077` pour creer des fichiers restrictifs, et lisent leur
configuration via variables d'environnement.

## Prerequis systeme

Les commandes suivantes doivent etre disponibles sur la machine qui execute les
scripts :

- `mysqldump` ;
- `mysql` ;
- `gzip` ;
- `gunzip` ;
- `curl` ;
- `java` ;
- `backend/mvnw` dans le dossier backend du projet.

Les scripts verifient les commandes dont ils dependent et echouent avec un
message explicite si une commande manque.

## Variables de backup

Variables obligatoires pour `scripts/backup-mysql.sh` :

| Variable | Exemple placeholder | Description |
| --- | --- | --- |
| `DB_HOST` | `<mysql-host>` | Hote MySQL. |
| `DB_PORT` | `3306` | Port MySQL. |
| `DB_NAME` | `<database-name>` | Base a sauvegarder. |
| `DB_USERNAME` | `<db-user>` | Utilisateur MySQL. |
| `DB_PASSWORD` | `<db-password>` | Mot de passe MySQL, jamais affiche. |

Variables optionnelles :

| Variable | Defaut | Description |
| --- | --- | --- |
| `BACKUP_DIR` | `$PWD/backups/mysql` | Dossier de sortie. En production, utiliser un chemin hors repo. |
| `BACKUP_RETENTION_DAYS` | `14` | Suppression locale des backups plus anciens. `0` desactive le nettoyage. |

Exemple local avec placeholders :

```bash
DB_HOST=<mysql-host> \
DB_PORT=3306 \
DB_NAME=<database-name> \
DB_USERNAME=<db-user> \
DB_PASSWORD=<db-password> \
BACKUP_DIR=/secure/path/bxconnect-backups \
BACKUP_RETENTION_DAYS=14 \
scripts/backup-mysql.sh
```

Le script utilise `mysqldump` avec :

- `--single-transaction` ;
- `--routines` ;
- `--triggers` ;
- `--set-gtid-purged=OFF`.

Il cree un fichier horodate `.sql.gz` avec permissions restrictives, verifie que
le dump existe et n'est pas vide, puis applique le nettoyage local selon la
retention.

Ne pas conserver durablement les dumps dans un dossier du projet, meme si ce
dossier est ignore par Git. Utiliser un dossier externe au repo puis copier le
backup chiffre vers un stockage hors serveur principal.

## Variables de restauration de test

Variables obligatoires pour `scripts/test-restore-mysql.sh` :

| Variable | Exemple placeholder | Description |
| --- | --- | --- |
| `DB_HOST` | `<mysql-host>` | Hote MySQL. |
| `DB_PORT` | `3306` | Port MySQL. |
| `DB_USERNAME` | `<db-user>` | Utilisateur MySQL pour importer dans la base jetable. |
| `DB_PASSWORD` | `<db-password>` | Mot de passe MySQL, jamais affiche. |
| `BACKUP_FILE` | `/secure/path/backup.sql.gz` | Backup `.sql.gz` a tester. Les `.sql` simples sont refuses. |
| `TEST_DB_NAME` | `bxconnect_restore_test` | Base jetable de restauration. |

Variables optionnelles :

| Variable | Defaut | Description |
| --- | --- | --- |
| `PRIMARY_DB_NAME` | `bxconnect_mvp1` | Base principale interdite pour la restauration de test. |
| `DB_ADMIN_USERNAME` | `$DB_USERNAME` | Utilisateur autorise a creer/recreer la base jetable. |
| `DB_ADMIN_PASSWORD` | `$DB_PASSWORD` | Mot de passe admin MySQL. |
| `BACKEND_DIR` | `./backend` | Dossier backend contenant `mvnw`. |
| `RESTORE_PORT` | `18090` | Port temporaire pour le backend de test. |

Exemple local avec placeholders :

```bash
DB_HOST=<mysql-host> \
DB_PORT=3306 \
DB_USERNAME=<db-user> \
DB_PASSWORD=<db-password> \
BACKUP_FILE=/secure/path/backup.sql.gz \
TEST_DB_NAME=bxconnect_restore_test \
PRIMARY_DB_NAME=<production-db-name> \
scripts/test-restore-mysql.sh
```

Le script refuse explicitement :

- une base de test vide ou au nom dangereux ;
- `TEST_DB_NAME` identique a `PRIMARY_DB_NAME` ;
- `TEST_DB_NAME=bxconnect_mvp1` ;
- un nom contenant `prod` ou `production`, quelle que soit la casse.

Il supprime/recree uniquement la base jetable indiquee par `TEST_DB_NAME`.
Les fichiers temporaires du test de restauration sont crees via `mktemp` avec
permissions restrictives et supprimes automatiquement a la fin du script, meme
en cas d'echec.

## Verification Flyway

Apres restauration, le script verifie :

- nombre de tables restaurees coherent ;
- table `flyway_schema_history` presente ;
- aucune migration Flyway en echec.

Commande SQL indicative :

```sql
SELECT installed_rank, version, description, type, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

## Demarrage backend apres restauration

Le script demarre le backend contre la base restauree avec :

```text
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=false
```

Puis il verifie :

```bash
curl -f http://localhost:<restore-port>/actuator/health
```

En production, ne jamais utiliser `ddl-auto=update`.

## Verification du backup

Apres creation :

- verifier que le fichier `.sql.gz` existe et n'est pas vide ;
- verifier que la commande retourne un code de sortie `0` ;
- verifier que le backup est copie vers le stockage externe ;
- chiffrer avant transfert selon l'hebergeur ;
- verifier que le backup n'apparait pas dans `git status`.

## Restauration apres incident

1. Identifier la cause : corruption, erreur humaine, migration, panne serveur.
2. Stopper les ecritures applicatives si necessaire.
3. Sauvegarder l'etat actuel meme corrompu si possible.
4. Choisir le point de restauration.
5. Restaurer sur une base jetable avec `scripts/test-restore-mysql.sh`.
6. Verifier Flyway, `ddl-auto=validate` et `/actuator/health`.
7. Executer les controles metier ci-dessous.
8. Basculer vers la base restauree seulement apres validation humaine.

Ne jamais restaurer directement sur la base de production sans decision
d'incident, backup prealable et validation humaine.

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
5. Verifier `/actuator/health`.
6. Executer les smoke tests metier.
7. Documenter resultat, date, responsable et anomalies.

## Backup local, distant et manage

- Backup local : utile pour un test ponctuel ou pre-deploiement, insuffisant
  seul en production.
- Backup distant : copie chiffree hors serveur principal, obligatoire pour les
  donnees reelles.
- Backup manage hebergeur : recommande si disponible, mais il doit aussi etre
  teste par restauration periodique.

## En cas d'echec

- Si `backup-mysql.sh` echoue : ne pas deployer ; verifier acces MySQL, espace
  disque, droits utilisateur et dossier de sortie.
- Si `test-restore-mysql.sh` echoue : considerer le backup non valide tant que
  la cause n'est pas comprise.
- Si Flyway echoue apres restauration : ne pas basculer vers cette base.
- Si `/actuator/health` ne repond pas : le script affiche les dernieres lignes
  du log backend temporaire avant de nettoyer les fichiers temporaires.
