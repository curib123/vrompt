#!/usr/bin/env bash
set -Eeuo pipefail

: "${BACKUP_REMOTE:?Set BACKUP_REMOTE to an encrypted rclone remote path.}"
: "${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT to the age public recipient.}"

COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml)
POSTGRES_DB="${POSTGRES_DB:-vrompt}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
BACKUP_TMP="$(mktemp -d "${TMPDIR:-/tmp}/vrompt-backup.XXXXXX")"
BACKUP_NAME="vrompt-postgres-$(date -u +%Y-%m-%dT%H-%M-%SZ).sql.gz.age"
BACKUP_FILE="${BACKUP_TMP}/${BACKUP_NAME}"

cleanup() {
  rm -rf "${BACKUP_TMP}"
}

notify_failure() {
  if [[ -n "${BACKUP_ALERT_WEBHOOK:-}" ]]; then
    curl --fail --silent --show-error --max-time 10 \
      -H 'Content-Type: application/json' \
      --data '{"text":"Vrompt PostgreSQL backup failed."}' \
      "${BACKUP_ALERT_WEBHOOK}" || true
  fi
}

trap cleanup EXIT
trap notify_failure ERR

echo "Creating encrypted PostgreSQL backup ${BACKUP_NAME}."
"${COMPOSE[@]}" exec -T vrompt-postgres \
  pg_dump --no-owner --no-privileges -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  | gzip -c \
  | age --encrypt --recipient "${BACKUP_AGE_RECIPIENT}" --output "${BACKUP_FILE}"

sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
rclone copyto "${BACKUP_FILE}" "${BACKUP_REMOTE}/${BACKUP_NAME}"
rclone copyto "${BACKUP_FILE}.sha256" "${BACKUP_REMOTE}/${BACKUP_NAME}.sha256"

if [[ -n "${BACKUP_RETENTION_DAYS:-}" ]]; then
  rclone delete --min-age "${BACKUP_RETENTION_DAYS}" "${BACKUP_REMOTE}"
fi

echo "Backup uploaded to ${BACKUP_REMOTE}/${BACKUP_NAME}."
