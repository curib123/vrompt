#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${VROMPT_PUBLIC_URL:-http://localhost}"
MAX_ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-30}"

for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
  if curl --fail --silent --show-error --max-time 10 "${BASE_URL%/}/health" >/dev/null; then
    echo "Vrompt health check passed on attempt ${attempt}."
    exit 0
  fi
  sleep 2
done

echo "Vrompt health check failed after ${MAX_ATTEMPTS} attempts." >&2
exit 1
