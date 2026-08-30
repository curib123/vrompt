#!/usr/bin/env bash
set -Eeuo pipefail

: "${BACKUP_REMOTE:?Set BACKUP_REMOTE to the encrypted rclone remote path.}"
: "${BACKUP_AGE_IDENTITY:?Set BACKUP_AGE_IDENTITY to the age private identity file.}"
: "${BACKUP_NAME:?Set BACKUP_NAME to the encrypted backup filename.}"
: "${ALLOW_PRODUCTION_RESTORE:?Set ALLOW_PRODUCTION_RESTORE=true to confirm a production restore.}"

if [[ "${ALLOW_PRODUCTION_RESTORE}" != 'true' ]]; then
  echo 'Production restore requires ALLOW_PRODUCTION_RESTORE=true.' >&2
  exit 1
fi

COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml)
POSTGRES_DB="${POSTGRES_DB:-vrompt}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
RESTORE_TMP="$(mktemp -d "${TMPDIR:-/tmp}/vrompt-restore.XXXXXX")"
BACKUP_FILE="${RESTORE_TMP}/${BACKUP_NAME}"

cleanup() {
  rm -rf "${RESTORE_TMP}"
}
trap cleanup EXIT

rclone copyto "${BACKUP_REMOTE}/${BACKUP_NAME}" "${BACKUP_FILE}"
rclone copyto "${BACKUP_REMOTE}/${BACKUP_NAME}.sha256" "${BACKUP_FILE}.sha256"
(cd "${RESTORE_TMP}" && sha256sum --check "${BACKUP_NAME}.sha256")

echo 'Restoring PostgreSQL. This overwrites current application data.'
age --decrypt --identity "${BACKUP_AGE_IDENTITY}" "${BACKUP_FILE}" \
  | gzip -dc \
  | "${COMPOSE[@]}" exec -T vrompt-postgres psql \
      --set ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

echo "PostgreSQL restore ${BACKUP_NAME} completed."
