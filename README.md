# Vrompt

Vrompt is a monorepo for a private, multi-model AI workspace. It provides a Next.js chat application, a NestJS API, configurable model routing, usage controls, billing, shared TypeScript packages, and Docker-based development and production environments.

## Repository structure

```text
apps/
  api/                 NestJS API, Prisma schema, migrations, and seeds
  web/                 Next.js web application
packages/
  config/              Shared TypeScript and ESLint configuration
  shared/              Shared runtime utilities
  types/               Shared TypeScript types
infrastructure/
  docker/              API, web, and Nginx Dockerfiles/configuration
  vps/                 Ubuntu/VPS bootstrap guidance
  https/               TLS and certificate guidance
  backups/             PostgreSQL backup and restore scripts
  monitoring/          Production health and metrics checks
  alpha/               Private alpha testing materials
  beta/                Controlled beta operations materials
  validation/          MVP validation materials
  release/             Release audit and sign-off checks
docs/                  SEO and webmaster operations
docker-compose.yml     Base local services
docker-compose.dev.yml Local development overlay
docker-compose.local.yml Local host-port overrides
docker-compose.prod.yml Production-shaped stack
docker-compose.migrate.yml One-shot production migration service
docker-compose.deploy.yml Deployment image overlay
```

## Technology

- Node.js 20 or newer and npm 10 or newer
- TypeScript and Turborepo
- Next.js and React
- NestJS
- Prisma and PostgreSQL
- Redis
- Docker Desktop with the Linux engine

## Quick start with Node.js

1. Copy `.env.example` to `.env` and adjust values when needed.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start PostgreSQL and Redis, then initialize Prisma:

   ```bash
   npm run prisma:generate --workspace @vrompt/api
   npm run prisma:deploy --workspace @vrompt/api
   npm run prisma:seed --workspace @vrompt/api
   ```

4. Start the web and API applications:

   ```bash
   npm run dev
   ```

The web application runs at [http://localhost:3000](http://localhost:3000). The API runs at [http://localhost:4000](http://localhost:4000), with its health endpoint at [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health). Swagger is available at [http://localhost:4000/api/docs](http://localhost:4000/api/docs) when `SWAGGER_ENABLED=true`.

## Docker development

Docker development runs the API, web app, PostgreSQL, and Redis with source bind mounts and watch mode:

```bash
docker compose -p vrompt-dev \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  -f docker-compose.local.yml \
  up -d --build
```

On PowerShell, use the same command as one line if preferred:

```powershell
docker compose -p vrompt-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.local.yml up -d --build
```

Open [http://localhost:3001](http://localhost:3001). The API health endpoint is [http://localhost:4001/api/v1/health](http://localhost:4001/api/v1/health). Check service state with:

```bash
docker compose -p vrompt-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.local.yml ps
```

Stop the stack without deleting its named database volume:

```bash
docker compose -p vrompt-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.local.yml down
```

Development data is stored in the named `vrompt-dev_vrompt-postgres-data` volume. Private chat attachments are stored in the configured chat storage directory. Do not use `down -v` unless you intentionally want to delete local database data.

### Development seed

The seed command creates starter Free/Pro plans, provider models, Auto fallback, and generation policies. Run it after PostgreSQL is healthy:

```bash
docker compose -p vrompt-dev \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  -f docker-compose.local.yml \
  --profile seed run --rm vrompt-seed
```

## Environment configuration

Use `.env.example` for local development and `.env.production.example` as the production template. Never commit `.env`, `.env.production`, API keys, OAuth secrets, payment secrets, JWT secrets, or Cloudinary credentials.

Important configuration groups include:

| Group          | Variables                                                                   | Purpose                                |
| -------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| Web            | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `INTERNAL_API_BASE_URL` | Browser and server API routing         |
| Data           | `DATABASE_URL`, `REDIS_URL`                                                 | PostgreSQL and Redis connections       |
| AI             | `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `CHAT_STORAGE_DIR` | Server-side providers and private files |
| Authentication | `JWT_*`, `GOOGLE_*`, `GITHUB_*`                                             | Tokens and OAuth callbacks             |
| Staff          | `ADMIN_BOOTSTRAP_*`, `MODERATOR_BOOTSTRAP_*`                                | Initial control-panel accounts         |
| Media          | `MEDIA_STORAGE_DRIVER`, `MEDIA_STORAGE_LOCAL_DIR`, `CLOUDINARY_*`           | Local or Cloudinary evidence storage   |
| Payments       | `PAYMONGO_*`                                                                | Pro subscription checkout and webhooks |

OAuth callback URLs must point to the API, not the web application. For local development they are:

```text
http://localhost:4000/api/v1/auth/google/callback
http://localhost:4000/api/v1/auth/github/callback
```

When using the Docker local override, use port `4001` for the callback URLs because the API is published on that host port.

## Workspace commands

Run commands from the repository root:

```bash
npm run dev          # Start all development workspaces
npm run build        # Build all workspaces
npm run lint         # Lint all workspaces
npm run typecheck    # Type-check all workspaces
npm run test         # Run all unit tests
npm run format       # Check Prettier formatting
npm run format:write # Apply Prettier formatting
npm run clean        # Remove generated workspace output
```

Target an individual workspace with npm's workspace option:

```bash
npm run test --workspace @vrompt/api
npm run test --workspace @vrompt/web
npm run build --workspace @vrompt/api
npm run build --workspace @vrompt/web
```

### API tests

```bash
npm test --workspace @vrompt/api
```

### Web tests

```bash
npm test --workspace @vrompt/web
```

## Production-shaped Docker stack

The Oracle Cloud deployment workflow and one-time host setup are documented in
[`docs/production-deployment.md`](docs/production-deployment.md). Releases are
promoted through `development` and a pull request into `production`; the
production VM does not build source code or merge branches.

1. Copy `.env.production.example` to an ignored `.env.production` file.
2. Set the domain, TLS paths, database credentials, OAuth credentials, JWT secret, storage credentials, and payment secrets.
3. Validate the Compose configuration:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
   ```

4. Start the stack:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```

Production publishes only Nginx. PostgreSQL, Redis, the API, and the web runtime remain internal to the Compose network. Run migrations with the deployment workflow or the one-shot migration Compose configuration; do not manually rewrite checked-in Prisma migrations.

Operational scripts and runbooks are under `infrastructure/`. The release audit is:

```bash
bash infrastructure/release/phase1-audit.sh
```

## API and application behavior

- API routes are prefixed with `/api/v1`.
- OAuth sign-in uses Google and GitHub provider identities; local user email/password authentication is not supported.
- Staff accounts use the separate `/staff/login` flow.
- The admin control panel is available at `/admin` for authorized staff.
- Chat attachments are private and validated before storage. Configure `CHAT_STORAGE_DIR` for local files or provide a production storage adapter.
- Workspace routes include `/chat`, `/conversations`, `/saved-prompts`, `/usage`, `/settings`, and `/billing`; staff use the separate `/admin` control panel.
- Provider credentials remain server-side. Models, prices, capabilities, fallback, and plan allowances are configured through the protected workspace administration API.

## Troubleshooting

Check the service logs:

```bash
docker compose -p vrompt-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.local.yml logs --tail 100 vrompt-api vrompt-web
```

If a container name conflict occurs, inspect only Vrompt containers before removing stopped stale containers:

```bash
docker ps -a --filter name=vrompt
```

If a Docker build fails while resolving `deb.debian.org` or the Linux engine closes, restore Docker Desktop's Linux engine and BuildKit before retrying. A completed source build does not prove that the running container contains the current code; verify `docker compose ps` and the live health endpoint after recreation.

For local development, avoid deleting volumes. The PostgreSQL volume contains application data, and the private chat storage directory contains uploaded attachments.

## License

This repository is private and currently marked `UNLICENSED` in its package metadata.
