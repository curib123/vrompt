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

Open [http://localhost:3100](http://localhost:3100). The API health endpoint is [http://localhost:3200/api/v1/health](http://localhost:3200/api/v1/health). Check service state with:

```bash
docker compose -p vrompt-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.local.yml ps
```

Stop the stack without deleting its named database volume:

```bash
docker compose -p vrompt-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.local.yml down
```

Development data is stored in the named `vrompt-dev_vrompt-postgres-data` volume. Private chat attachments are stored in the configured chat storage directory. Do not use `down -v` unless you intentionally want to delete local database data.

### Development seed

The optional development seed creates starter Free/Pro plans, provider models, and generation policies. It creates no demo users or prompts, preserves existing admin configuration, and refuses to run in production. Run it after PostgreSQL is healthy:

```bash
docker compose -p vrompt-dev \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  -f docker-compose.local.yml \
  --profile seed run --rm vrompt-seed
```

## Environment configuration

### Brand interface and administration

The responsive interface uses the Vrompt brand palette, a local Inter variable font, and light/dark appearance. Sign-in opens in a modal over the current screen; `/login` opens the same modal directly. Google/GitHub OAuth retains a validated internal return path.

- `/admin/settings`: persisted branding, announcements, registration, prompt starters, and administrator password changes.
- `/admin/models`: model capabilities, availability, pricing, fallback, and Auto routing policies.
- `/admin/plans`: plan prices, workspace limits, and daily/monthly generation allowances.
- `/admin/users`: searchable accounts, administrator creation, role/status changes, and password reset.
- `/admin/billing`, `/admin/analytics`, `/admin/audit`: payment/webhook monitoring, currency-separated costs, and recorded changes.
- `/settings`: persisted display name and message-send behavior; appearance is saved per device.

Apply all migrations before running the app:

```bash
npm run prisma:generate --workspace @vrompt/api
npm run prisma:deploy --workspace @vrompt/api
```

The application supports active USER and ADMIN roles. Legacy moderator records remain available for historical data, but cannot sign in or use protected endpoints. An administrator can explicitly reassign a legacy account from Users. No accounts are automatically promoted.

Public model cards come from `/api/v1/catalog/models`. Only enabled, configured models within their availability dates appear. Maintenance or missing credentials hide them; the chat selector also enforces plan-specific access. The reference artwork's Llama logo does not imply a Meta provider integration; supported adapters are OpenAI, Google, Anthropic, Groq, and Mistral. Provider marks are bundled locally under `apps/web/public/providers`.

The landing page contains the hero, supported providers, Why Vrompt, Auto explanation, models, pricing, and final signup action. Old `/features`, `/auto`, `/models`, and `/pricing` URLs redirect to the matching section. Signup and login use the same OAuth modal and preserve a selected plan, model, or prompt through sign-in.

The app can run without AI or payment credentials. Chat keeps the composer available for drafting, explains that generation is unavailable, and prevents submission without consuming credits. No synthetic AI responses are generated. On a fresh install, migrations create bounded starter models and policies for all five providers. Add a valid provider key to the private environment and recreate/redeploy the API to enable its models. Existing custom pools stay explicit; review these in Admin if they intentionally exclude a provider.

Payments default to **test** mode. Add `PAYMONGO_SECRET_KEY=sk_test_...` and `PAYMONGO_WEBHOOK_SECRET` to the private environment and restart the API to enable test checkout. Register `/api/v1/webhooks/paymongo` with PayMongo using a publicly reachable HTTPS API URL. Missing credentials or a key/mode mismatch disable paid checkout. A browser redirect never grants a paid plan: a verified matching webhook must activate access. Paid access is renewed by checkout, with no automatic card charge. Configure plan prices, currency, and allowances in Admin; USD card acceptance must be enabled on the merchant account when using USD plans.

Migration `0033` removes identified legacy demo accounts and their copied prompt data, without matching real OAuth users or accounts with billing history. `0034` introduces revocable session families and signs out existing sessions once. `0035` disables only the old seeded launch promotion while retaining billing references. Migrations `0036`?`0038` add Groq, current production starter models and policies, replace retired IDs in pools, and update the original Mistral price card. Back up an existing database before applying cleanup migrations.

Authentication uses memory-only access tokens, rotating HttpOnly refresh cookies, issuer/audience validation, OAuth state and PKCE, and immediate session revocation on logout, password changes, suspension, or role changes. Cookie-authenticated mutations require `X-Vrompt-Client: web` and validate browser origin. The API enforces USER/ADMIN roles and ownership independently of UI restrictions. Admin promotion requires a password; self-demotion and self-suspension are rejected.

When the browser API URL is omitted, Next.js proxies `/api/v1` to `INTERNAL_API_BASE_URL`, defaulting to the local API on port 4000. OAuth and payment providers require valid server credentials and callbacks before live use.

Browser regressions run with `npm run test:e2e --workspace @vrompt/web` against the running web app. They use intercepted API fixtures to test UI behavior without provider calls. `apps/api/test/workspace.live.cjs` additionally checks a running API against an explicitly isolated local database named `vrompt_review`; it requires `DATABASE_URL`, `JWT_ACCESS_SECRET`, `REVIEW_ADMIN_EMAIL`, and `REVIEW_ADMIN_PASSWORD`. It creates test records and must never target an operational database.

`apps/api/test/auth.live.cjs` is an opt-in local regression for rotation/replay, role and ownership checks, password changes, suspension, and unavailable-provider usage. It requires `AUTH_REVIEW=true`, a local database, and matching server environment; it creates temporary accounts and removes its records in `finally`. For the local Docker stack:

```bash
docker compose -p vrompt-dev -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.local.yml run --rm --no-deps -e AUTH_REVIEW=true -e AUTH_REVIEW_API_URL=http://vrompt-api:4000/api/v1 vrompt-api node apps/api/test/auth.live.cjs
```

Use `.env.example` for local development and `.env.production.example` as the production template. Never commit `.env`, `.env.production`, API keys, OAuth secrets, payment secrets, JWT secrets, or Cloudinary credentials.

Important configuration groups include:

| Group          | Variables                                                                                         | Purpose                                 |
| -------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Web            | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `INTERNAL_API_BASE_URL`                       | Browser and server API routing          |
| Data           | `DATABASE_URL`, `REDIS_URL`                                                                       | PostgreSQL and Redis connections        |
| AI             | `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `CHAT_STORAGE_DIR` | Server-side providers and private files |
| Authentication | `JWT_*`, `GOOGLE_*`, `GITHUB_*`                                                                   | Tokens and OAuth callbacks              |
| Staff          | `ADMIN_BOOTSTRAP_*`                                                                               | Initial control-panel accounts          |
| Media          | `MEDIA_STORAGE_DRIVER`, `MEDIA_STORAGE_LOCAL_DIR`, `CLOUDINARY_*`                                 | Local or Cloudinary evidence storage    |
| Payments       | `PAYMONGO_*`                                                                                      | Pro subscription checkout and webhooks  |

OAuth callback URLs must point to the API, not the web application. For local development they are:

```text
http://localhost:4000/api/v1/auth/google/callback
http://localhost:4000/api/v1/auth/github/callback
```

When using the Docker local override, use port `3200` for the callback URLs because the API is published on that host port.

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

### Isolated generation ledger verification

After applying migrations to the dedicated local database `vrompt_mvp_review_20260906`, run `apps/api/test/generation-ledger.live.cjs` in the API environment with `GENERATION_REVIEW=true`. The script refuses production environments and always uses that isolated database. It uses the real chat service, model registry, quotas, transactions and accounting tables with a fixture provider transport. It checks Auto/manual continuation, recorded tokens and cost, credit deductions, idempotency, concurrent reservation limits, failed-response retry and immutable records. Fixture records stay in the isolated database; they never enter the application database.

Starter model references (checked September 6, 2026): [Groq models](https://console.groq.com/docs/models), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini retirements](https://ai.google.dev/gemini-api/docs/deprecations), [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Claude retirements](https://platform.claude.com/docs/en/about-claude/model-deprecations), [Mistral pricing](https://docs.mistral.ai/inference/pricing). Admin prices remain editable; verify them when changing models.
