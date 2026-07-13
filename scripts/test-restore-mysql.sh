#!/usr/bin/env bash
set -euo pipefail
umask 077

log() {
  printf '[test-restore-mysql] %s\n' "$1"
}

fail() {
  printf '[test-restore-mysql] ERROR: %s\n' "$1" >&2
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

require_command mysql
require_command mysqldump
require_command gzip
require_command gunzip
require_command curl
require_command java

require_non_empty_env DB_HOST
require_non_empty_env DB_PORT
require_non_empty_env DB_USERNAME
require_env DB_PASSWORD
require_non_empty_env BACKUP_FILE
require_non_empty_env TEST_DB_NAME

PRIMARY_DB_NAME="${PRIMARY_DB_NAME:-bxconnect_mvp1}"
DB_ADMIN_USERNAME="${DB_ADMIN_USERNAME:-$DB_USERNAME}"
DB_ADMIN_PASSWORD="${DB_ADMIN_PASSWORD:-$DB_PASSWORD}"
BACKEND_DIR="${BACKEND_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../backend" && pwd)}"
RESTORE_PORT="${RESTORE_PORT:-18090}"
HEALTH_URL="http://localhost:${RESTORE_PORT}/actuator/health"
backend_pid=""
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/bxconnect-restore.XXXXXX")"
backend_log="${tmp_dir}/backend.log"
health_file="${tmp_dir}/health.json"
cleanup() {
  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" 2>/dev/null; then
    log "Arret backend de test pid=${backend_pid}"
    kill "$backend_pid" 2>/dev/null || true
    wait "$backend_pid" 2>/dev/null || true
  fi
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

validate_db_name "$TEST_DB_NAME"
validate_db_name "$PRIMARY_DB_NAME"
lower_test_db_name="$(printf '%s' "$TEST_DB_NAME" | tr '[:upper:]' '[:lower:]')"

if [[ "$TEST_DB_NAME" == "$PRIMARY_DB_NAME" ]]; then
  fail "TEST_DB_NAME ne peut pas etre identique a PRIMARY_DB_NAME"
fi

if [[ "$TEST_DB_NAME" == "bxconnect_mvp1" || "$lower_test_db_name" == *prod* || "$lower_test_db_name" == *production* ]]; then
  fail "Nom de base de restauration refuse: ${TEST_DB_NAME}"
fi

if [[ "$BACKUP_FILE" != *.sql.gz ]]; then
  fail "Format de backup non supporte: utiliser uniquement .sql.gz"
fi

if [[ ! -f "$BACKUP_FILE" || ! -s "$BACKUP_FILE" || ! -r "$BACKUP_FILE" ]]; then
  fail "Backup absent, vide ou illisible: ${BACKUP_FILE}"
fi

if [[ ! -d "$BACKEND_DIR" || ! -x "$BACKEND_DIR/mvnw" ]]; then
  fail "BACKEND_DIR invalide ou mvnw absent: ${BACKEND_DIR}"
fi

log "Restauration de ${BACKUP_FILE} vers la base jetable ${TEST_DB_NAME}"

export MYSQL_PWD="$DB_ADMIN_PASSWORD"
mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_ADMIN_USERNAME" \
  -e "DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\`; CREATE DATABASE \`${TEST_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
unset MYSQL_PWD

export MYSQL_PWD="$DB_PASSWORD"
gzip -dc "$BACKUP_FILE" | mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USERNAME" "$TEST_DB_NAME"
unset MYSQL_PWD

export MYSQL_PWD="$DB_PASSWORD"
table_count="$(mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USERNAME" --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${TEST_DB_NAME}';")"
flyway_count="$(mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USERNAME" --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${TEST_DB_NAME}' AND table_name='flyway_schema_history';")"
failed_flyway="$(mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USERNAME" --batch --skip-column-names "$TEST_DB_NAME" \
  -e "SELECT COUNT(*) FROM flyway_schema_history WHERE success = 0;" 2>/dev/null || printf '1')"
expected_tables=(
  activites
  audit_logs
  business_conversation_participants
  business_conversations
  business_messages
  fils_discussion
  flyway_schema_history
  groupes
  messages
  notifications
  projets
  soutiens_financiers
  utilisateurs
)
for expected_table in "${expected_tables[@]}"; do
  present="$(mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USERNAME" --batch --skip-column-names \
    -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${TEST_DB_NAME}' AND table_name='${expected_table}';")"
  if [[ "$present" -ne 1 ]]; then
    unset MYSQL_PWD
    fail "Table attendue absente apres restauration: ${expected_table}"
  fi
done
unset MYSQL_PWD

if [[ "$table_count" -lt 20 ]]; then
  fail "Nombre de tables inattendu apres restauration: ${table_count}"
fi

if [[ "$flyway_count" -ne 1 ]]; then
  fail "Table flyway_schema_history absente apres restauration"
fi

if [[ "$failed_flyway" -ne 0 ]]; then
  fail "flyway_schema_history contient une migration en echec"
fi

log "Tables restaurees: ${table_count}; Flyway OK"

log "Demarrage backend contre ${TEST_DB_NAME} avec ddl-auto=validate"
(
  cd "$BACKEND_DIR"
  DB_PASSWORD="$DB_PASSWORD" \
  ./mvnw spring-boot:run \
    -Dspring-boot.run.arguments="--server.port=${RESTORE_PORT} --spring.datasource.url=jdbc:mysql://${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true --spring.datasource.username=${DB_USERNAME} --spring.jpa.hibernate.ddl-auto=validate --spring.flyway.enabled=true --spring.flyway.baseline-on-migrate=false"
) > "$backend_log" 2>&1 &
backend_pid="$!"

for attempt in {1..60}; do
  if curl -fsS "$HEALTH_URL" >"$health_file" 2>/dev/null; then
    log "Healthcheck OK: ${HEALTH_URL}"
    log "Test de restauration termine avec succes"
    exit 0
  fi
  sleep 2
done

tail -n 80 "$backend_log" >&2 || true
fail "Healthcheck backend indisponible apres restauration"
