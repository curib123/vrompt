#!/usr/bin/env bash
set -Eeuo pipefail

: "${BACKUP_FILE:?Set BACKUP_FILE to a local encrypted backup file.}"
: "${BACKUP_AGE_IDENTITY:?Set BACKUP_AGE_IDENTITY to the age private identity file.}"

CONTAINER="vrompt-restore-test-$$"
cleanup() {
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach --name "${CONTAINER}" \
  --env POSTGRES_PASSWORD=restore-test \
  postgres:16-alpine >/dev/null

for attempt in $(seq 1 30); do
  if docker exec "${CONTAINER}" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  if [[ "${attempt}" == '30' ]]; then
    echo 'Disposable restore database did not become ready.' >&2
    exit 1
  fi
  sleep 2
done

age --decrypt --identity "${BACKUP_AGE_IDENTITY}" "${BACKUP_FILE}" \
  | gzip -dc \
  | docker exec --interactive "${CONTAINER}" psql \
      --set ON_ERROR_STOP=1 -U postgres -d postgres >/dev/null

TABLE_COUNT="$(docker exec "${CONTAINER}" psql -U postgres -d postgres -tAc "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public';")"
if [[ "${TABLE_COUNT}" -lt 1 ]]; then
  echo 'Restore test completed without any public tables.' >&2
  exit 1
fi

echo "Disposable PostgreSQL restore succeeded with ${TABLE_COUNT} public tables."
