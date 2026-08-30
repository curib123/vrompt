#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT_DIR"

failures=0
warnings=0
fail() {
  printf 'FAIL: %s\n' "$1" >&2
  failures=$((failures + 1))
}
warn() {
  printf 'WARN: %s\n' "$1" >&2
  warnings=$((warnings + 1))
}

required_files=(
  docker-compose.prod.yml
  docker-compose.migrate.yml
  infrastructure/docker/api.Dockerfile
  infrastructure/docker/web.Dockerfile
  infrastructure/docker/nginx.Dockerfile
  infrastructure/docker/nginx.conf.template
  infrastructure/https/README.md
  infrastructure/backups/backup-postgres.sh
  infrastructure/backups/restore-postgres.sh
  infrastructure/backups/test-restore.sh
  infrastructure/monitoring/check-production.sh
  infrastructure/validation/MVP_VALIDATION_REPORT.md
  .github/workflows/ci-cd.yml
)

for file in "${required_files[@]}"; do
  [[ -f "$file" ]] || fail "required release artifact is missing: $file"
done

if command -v docker >/dev/null 2>&1; then
  if [[ -f .env.production ]]; then
    docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet ||
      fail 'production Compose configuration is invalid'
  else
    warn '.env.production is absent; skipping environment-backed Compose rendering'
  fi
else
  warn 'Docker is unavailable; skipping production Compose rendering'
fi

if [[ -n "${VROMPT_PUBLIC_URL:-}" ]]; then
  curl --fail --silent --show-error --max-time 10 "$VROMPT_PUBLIC_URL/health" >/dev/null ||
    fail 'public health endpoint failed'
else
  warn 'VROMPT_PUBLIC_URL is absent; skipping live endpoint check'
fi

if grep -Eq '^[[:space:]]*-?[[:space:]]*5432:' docker-compose.prod.yml ||
  grep -Eq '^[[:space:]]*-?[[:space:]]*6379:' docker-compose.prod.yml; then
  fail 'production Compose exposes PostgreSQL or Redis ports'
fi

if grep -q 'MEDIA_STORAGE_DRIVER: cloudinary' docker-compose.prod.yml; then
  printf 'OK: production Compose selects Cloudinary evidence storage\n'
else
  warn 'production Compose does not hard-code Cloudinary; verify MEDIA_STORAGE_DRIVER=cloudinary in .env.production'
fi

printf 'Automated launch audit: %s failure(s), %s warning(s)\n' "$failures" "$warnings"
if [[ "$failures" -gt 0 ]]; then
  exit 1
fi
