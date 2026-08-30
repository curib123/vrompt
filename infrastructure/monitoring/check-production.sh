#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${VROMPT_PUBLIC_URL:?Set VROMPT_PUBLIC_URL, for example https://vrompt.example.com}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
MAX_DISK_USED_PERCENT="${MAX_DISK_USED_PERCENT:-85}"
MAX_MEMORY_USED_PERCENT="${MAX_MEMORY_USED_PERCENT:-90}"
BACKUP_STATUS_FILE="${BACKUP_STATUS_FILE:-infrastructure/backups/.last-successful-backup}"
BACKUP_MAX_AGE_SECONDS="${BACKUP_MAX_AGE_SECONDS:-172800}"

failures=0
fail() {
  printf 'FAIL: %s\n' "$1" >&2
  failures=$((failures + 1))
}

printf 'Checking Vrompt production at %s\n' "$BASE_URL"

if ! curl --fail --silent --show-error --max-time 10 "$BASE_URL/health" >/dev/null; then
  fail 'public health endpoint is unavailable'
else
  printf 'OK: public health endpoint\n'
fi

if ! curl --fail --silent --show-error --max-time 10 "$BASE_URL/api/v1/health/metrics" >/dev/null; then
  fail 'metrics endpoint is unavailable'
else
  printf 'OK: aggregate metrics endpoint\n'
fi

if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps | grep -Eiq 'unhealthy|exit|dead'; then
  printf 'OK: compose services report no unhealthy or stopped containers\n'
else
  fail 'one or more compose services are unhealthy or stopped'
fi

disk_used=$(df -P / | awk 'NR == 2 {gsub(/%/, "", $5); print $5}')
if [[ -z "$disk_used" || "$disk_used" -ge "$MAX_DISK_USED_PERCENT" ]]; then
  fail "disk usage is ${disk_used:-unknown}% (limit ${MAX_DISK_USED_PERCENT}%)"
else
  printf 'OK: disk usage %s%%\n' "$disk_used"
fi

if command -v free >/dev/null 2>&1; then
  memory_used=$(free | awk '/Mem:/ {printf "%.0f", ($3 / $2) * 100}')
  if [[ "$memory_used" -ge "$MAX_MEMORY_USED_PERCENT" ]]; then
    fail "memory usage is ${memory_used}% (limit ${MAX_MEMORY_USED_PERCENT}%)"
  else
    printf 'OK: memory usage %s%%\n' "$memory_used"
  fi
else
  printf 'WARN: free is unavailable; skipping memory threshold\n'
fi

if [[ -f "$BACKUP_STATUS_FILE" ]]; then
  backup_timestamp=$(stat -c %Y "$BACKUP_STATUS_FILE")
  backup_age=$(( $(date +%s) - backup_timestamp ))
  if [[ "$backup_age" -gt "$BACKUP_MAX_AGE_SECONDS" ]]; then
    fail "backup status is ${backup_age}s old (limit ${BACKUP_MAX_AGE_SECONDS}s)"
  else
    printf 'OK: latest backup status is %ss old\n' "$backup_age"
  fi
else
  fail "backup status file is missing: $BACKUP_STATUS_FILE"
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stats --no-stream 2>/dev/null ||
  printf 'WARN: container resource stats are unavailable\n'

if [[ "$failures" -gt 0 ]]; then
  printf '%s production check(s) failed\n' "$failures" >&2
  exit 1
fi

printf 'Production checks passed\n'
