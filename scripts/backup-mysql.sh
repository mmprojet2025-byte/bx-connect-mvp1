#!/usr/bin/env bash
set -euo pipefail
umask 077

log() {
  printf '[backup-mysql] %s\n' "$1"
}

fail() {
  printf '[backup-mysql] ERROR: %s\n' "$1" >&2
  exit 1
}

require_env() {
  local name="$1"
  if [[ -z "${!name+x}" ]]; then
    fail "Variable d'environnement manquante: ${name}"
  fi
}

require_non_empty_env() {
  local name="$1"
  require_env "$name"
  if [[ -z "${!name}" ]]; then
    fail "Variable d'environnement vide: ${name}"
  fi
}

validate_db_name() {
  local value="$1"
  if [[ ! "$value" =~ ^[A-Za-z0-9_]+$ ]]; then
    fail "Nom de base invalide: utiliser uniquement lettres, chiffres et underscore"
  fi
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "Commande systeme manquante: ${command_name}"
  fi
}

require_command mysqldump
require_command gzip

require_non_empty_env DB_HOST
require_non_empty_env DB_PORT
require_non_empty_env DB_NAME
require_non_empty_env DB_USERNAME
require_env DB_PASSWORD

validate_db_name "$DB_NAME"

BACKUP_DIR="${BACKUP_DIR:-$PWD/backups/mysql}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [[ ! "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  fail "BACKUP_RETENTION_DAYS doit etre un entier positif ou nul"
fi

mkdir -p "$BACKUP_DIR"

timestamp="$(date +%Y%m%d_%H%M%S)"
base_name="${DB_NAME}_${timestamp}"
dump_file="${BACKUP_DIR}/${base_name}.sql"
archive_file="${dump_file}.gz"

log "Debut sauvegarde MySQL de ${DB_NAME} vers ${archive_file}"

export MYSQL_PWD="$DB_PASSWORD"
if ! mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USERNAME" \
  --single-transaction \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  "$DB_NAME" > "$dump_file"; then
  rm -f "$dump_file"
  unset MYSQL_PWD
  fail "mysqldump a echoue"
fi
unset MYSQL_PWD

if [[ ! -s "$dump_file" ]]; then
  rm -f "$dump_file"
  fail "Dump vide ou absent"
fi

gzip -f "$dump_file"

if [[ ! -s "$archive_file" ]]; then
  rm -f "$archive_file"
  fail "Archive gzip vide ou absente"
fi

log "Sauvegarde creee: ${archive_file}"

if [[ "$RETENTION_DAYS" -gt 0 ]]; then
  log "Nettoyage des sauvegardes de plus de ${RETENTION_DAYS} jours dans ${BACKUP_DIR}"
  find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete
else
  log "Retention desactivee pour cette execution"
fi

log "Sauvegarde terminee avec succes"
