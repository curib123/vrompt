#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "${ROOT_DIR}"

: "${VROMPT_DEPLOY_BRANCH:=production}"
: "${VROMPT_EXPECTED_REPO:=}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${VROMPT_IMAGE_PREFIX:?VROMPT_IMAGE_PREFIX is required}"

if [[ ! -d .git || ! -f docker-compose.prod.yml || ! -d apps/api || ! -d apps/web ]]; then
  echo 'This directory is not a Vrompt checkout.' >&2
  exit 1
fi

current_branch=$(git branch --show-current)
if [[ "${current_branch}" != "${VROMPT_DEPLOY_BRANCH}" ]]; then
  echo "Refusing deployment from '${current_branch:-detached}'; expected '${VROMPT_DEPLOY_BRANCH}'." >&2
  exit 1
fi

if [[ -n "${VROMPT_EXPECTED_REPO}" ]]; then
  remote_url=$(git config --get remote.origin.url || true)
  if [[ "${remote_url}" != *"${VROMPT_EXPECTED_REPO}"* ]]; then
    echo "Origin '${remote_url}' does not match VROMPT_EXPECTED_REPO." >&2
    exit 1
  fi
fi

if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  echo 'Refusing deployment with tracked or untracked working-tree changes.' >&2
  exit 1
fi

echo "Fetching origin/${VROMPT_DEPLOY_BRANCH}."
git fetch --prune origin "${VROMPT_DEPLOY_BRANCH}"
git merge --ff-only "origin/${VROMPT_DEPLOY_BRANCH}"

if [[ ! -f .env.production ]]; then
  echo '.env.production is required and must remain outside Git.' >&2
  exit 1
fi

COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.migrate.yml -f docker-compose.deploy.yml)
export VROMPT_API_IMAGE="${VROMPT_IMAGE_PREFIX}/api:${IMAGE_TAG}"
export VROMPT_WEB_IMAGE="${VROMPT_IMAGE_PREFIX}/web:${IMAGE_TAG}"
export VROMPT_NGINX_IMAGE="${VROMPT_IMAGE_PREFIX}/nginx:${IMAGE_TAG}"
export VROMPT_MIGRATE_IMAGE="${VROMPT_IMAGE_PREFIX}/migrate:${IMAGE_TAG}"

echo 'Validating production Compose configuration.'
"${COMPOSE[@]}" config --quiet
echo "Pulling immutable Vrompt images for ${IMAGE_TAG}."
"${COMPOSE[@]}" pull vrompt-nginx vrompt-web vrompt-api vrompt-migrate
"${COMPOSE[@]}" --profile migration run --rm vrompt-migrate
"${COMPOSE[@]}" up -d --no-build --remove-orphans

VROMPT_PUBLIC_URL="${VROMPT_PUBLIC_URL:-https://${VROMPT_DOMAIN}}" \
  infrastructure/deploy/health-check.sh

echo "Vrompt deployment ${IMAGE_TAG} is healthy."
