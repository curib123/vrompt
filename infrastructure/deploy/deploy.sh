#!/usr/bin/env bash
set -Eeuo pipefail

: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${VROMPT_IMAGE_PREFIX:?VROMPT_IMAGE_PREFIX is required}"

COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.migrate.yml -f docker-compose.deploy.yml)
export VROMPT_API_IMAGE="${VROMPT_IMAGE_PREFIX}/api:${IMAGE_TAG}"
export VROMPT_WEB_IMAGE="${VROMPT_IMAGE_PREFIX}/web:${IMAGE_TAG}"
export VROMPT_NGINX_IMAGE="${VROMPT_IMAGE_PREFIX}/nginx:${IMAGE_TAG}"
export VROMPT_MIGRATE_IMAGE="${VROMPT_IMAGE_PREFIX}/migrate:${IMAGE_TAG}"

echo "Pulling immutable Vrompt images for ${IMAGE_TAG}."
"${COMPOSE[@]}" pull vrompt-nginx vrompt-web vrompt-api vrompt-migrate
"${COMPOSE[@]}" --profile migration run --rm vrompt-migrate
"${COMPOSE[@]}" up -d --no-build --remove-orphans

VROMPT_PUBLIC_URL="${VROMPT_PUBLIC_URL:-https://${VROMPT_DOMAIN}}" \
  infrastructure/deploy/health-check.sh

echo "Vrompt deployment ${IMAGE_TAG} is healthy."
