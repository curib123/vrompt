# Vrompt production deployment

This runbook deploys the existing production-shaped Compose stack to an Oracle
Cloud Free Tier Ubuntu VM. The VM is deployment-only: changes are merged to
`production` in GitHub and the VM fast-forwards that branch.

## One-time Oracle setup

1. Create an Ubuntu LTS VM with a reserved public IP. Allow TCP 22, 80, and
   443 in the Oracle security list and host firewall.
2. Install the host prerequisites and create the deploy user:

   ```bash
   sudo VROMPT_USER=vrompt bash infrastructure/vps/bootstrap-ubuntu.sh
   ```

3. Add the GitHub Actions deploy key to `/home/vrompt/.ssh/authorized_keys`,
   then clone the repository as `vrompt`:

   ```bash
   sudo -u vrompt git clone <github-repository-url> /srv/vrompt
   cd /srv/vrompt
   git switch --track -c production origin/production
   ```

4. Copy `.env.production.example` to `/srv/vrompt/.env.production`, set a
   strong database password, Redis password, JWT secret, OAuth credentials,
   AI and PayMongo secrets, Cloudinary credentials, and the final HTTPS domain.
   Keep this file root/deploy-user readable only; it is ignored by Git.
5. Point DNS `A` records for the apex domain and `www` at the reserved IP.
6. Obtain the first certificate using the instructions in
   `infrastructure/https/README.md`, then verify the certificate paths in the
   production environment file.

## GitHub configuration

Protect `production` and require pull requests from `development`. Configure
the repository variable `VROMPT_SITE_URL` (for example,
`https://vrompt.example.com`) and the secrets `ORACLE_HOST`, `ORACLE_USER`, and
`ORACLE_SSH_KEY`. The legacy `VPS_*` secret names remain supported.

The workflow runs quality checks on `development` and `production`; only a
push to `production` publishes immutable images and invokes the Oracle deploy.

## First deployment

From the VM, validate the checked-in stack and deploy the image tag produced by
GitHub Actions:

```bash
cd /srv/vrompt
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
IMAGE_TAG=<github-commit-sha> \
VROMPT_IMAGE_PREFIX=ghcr.io/<owner>/vrompt \
./deploy.sh
```

The script verifies the repository, branch, clean working tree, fast-forwards
from `origin/production`, validates `.env.production` and Compose, applies
Prisma migrations in the one-shot migration container, starts the stack without
deleting volumes, and checks `/health`.

Future releases are simply:

```bash
cd /srv/vrompt && ./deploy.sh
```

with `IMAGE_TAG` and `VROMPT_IMAGE_PREFIX` supplied by the workflow.

## Data safety and rollback

PostgreSQL and Redis use named Docker volumes; only Nginx publishes host ports.
Run the encrypted PostgreSQL backup timer described in
`infrastructure/backups/README.md` and test restores regularly. Cloudinary
objects require separate provider retention/versioning.

To roll back application images, run
`IMAGE_TAG=<known-good-sha> VROMPT_IMAGE_PREFIX=... infrastructure/deploy/rollback.sh`.
Do not reverse Prisma migrations automatically; restore a compatible database
backup or ship a forward migration after review.
