# Vrompt VPS Setup

Phase 37 targets a small Ubuntu VPS with approximately 2 vCPU, 4 GB RAM, and
40 GB or more of storage. The bootstrap script is intentionally explicit and
must be reviewed before running it as root.

## Bootstrap

1. Provision an Ubuntu LTS VPS and log in through the provider console or an
   existing administrative SSH account.
2. Copy `bootstrap-ubuntu.sh` to the VPS and run it as root. Override
   `VROMPT_USER` or `SSH_PORT` when needed.

```bash
sudo VROMPT_USER=vrompt SSH_PORT=22 bash infrastructure/vps/bootstrap-ubuntu.sh
```

3. Add the deployer's SSH public key to `/home/vrompt/.ssh/authorized_keys`.
4. Start a new SSH session as the non-root user and verify Docker access with
   `docker info`.
5. Clone the repository under `/srv/vrompt` and restrict ownership to the
   deploy user.

The script installs Docker Engine and the Compose plugin, enables automatic
security updates, Fail2ban, UFW, a 2 GB swapfile when no swap exists, and
Docker JSON log rotation. UFW permits only SSH, HTTP, and HTTPS. PostgreSQL
and Redis are not opened on the host; production Compose places them on its
internal network.

## Production storage

Create `/srv/vrompt/.env.production` with the values from
`.env.production.example`. Set `MEDIA_STORAGE_DRIVER=cloudinary` and provide
all Cloudinary credentials. Do not use a VPS filesystem volume for evidence
images in production. The only persistent production database volume is for
PostgreSQL; temporary upload buffers must remain bounded by the API and Nginx
limits.

## Operations

```bash
cd /srv/vrompt
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Check the public endpoint through Nginx and inspect service health with
`docker compose ps`. Keep SSH access available in a second session while
changing firewall or SSH settings. Rotate credentials through the environment
file and redeploy; never put them in Git or image layers.
