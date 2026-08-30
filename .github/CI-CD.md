# Vrompt CI/CD

Phase 39 uses `.github/workflows/ci-cd.yml` for pull requests and pushes to
`main`.

## Pull requests

The `quality` job starts disposable PostgreSQL and Redis services, applies
Prisma migrations, runs API/web lint, type-check, unit tests, the real-module
integration workflow, and both production builds. Evidence/storage behavior is
covered by the API unit and integration suites; no provider credential is used
in CI.

## Main deployment

After quality passes on `main`, the workflow builds and pushes immutable SHA
tags for API, migration, web, and Nginx images to GHCR. It then connects to the
VPS using the `VPS_HOST`, `VPS_USER`, and `VPS_SSH_KEY` GitHub Actions secrets
and runs `infrastructure/deploy/deploy.sh`. The VPS must already have
`.env.production` and GHCR pull credentials configured.

Deployment pulls all images, runs migrations in the one-shot migration image,
starts the new services, and checks the public `/health` endpoint. Any failed
command fails the job visibly. Keep the previous SHA available for rollback:

```bash
IMAGE_TAG=<previous-sha> \
VROMPT_IMAGE_PREFIX=ghcr.io/<owner>/vrompt \
./infrastructure/deploy/rollback.sh
```

The production environment, Cloudinary credentials, SSH private key, and GHCR
token must remain in GitHub/VPS secret stores. Do not use plaintext secrets in
workflow YAML, image build args, or repository files.
