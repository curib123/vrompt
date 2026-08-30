# Vrompt

Vrompt is the repository for AI prompts. This workspace contains the Phase 1 through Phase 30 MVP foundation: a TypeScript monorepo, a Next.js frontend shell, a NestJS API shell, a normalized Prisma/PostgreSQL data model, media storage adapters, Google-only authentication, user profiles, prompt organization, repository creation, repository detail pages, copy tracking, immutable prompt versions, Create Variant, Variant Lineage, saved prompt repositories, repository likes, community comments, creator follows, prompt collections, repository search, repository-first Explore, a repository-first homepage, a followed-creator activity feed, in-app notifications, repository activity history, user reporting, role-protected moderation, admin audit logs, an API security baseline, and labeled starter content.

## Workspace layout

```text
apps/
  api/        NestJS API foundation
  web/        Next.js frontend foundation
packages/
  config/     Shared TypeScript and ESLint configuration
  shared/     Shared runtime constants and utilities
  types/      Shared TypeScript models
infrastructure/
  docker/     Container definitions
apps/api/prisma/
              PostgreSQL schema, migrations, and seed infrastructure

## Brand Identity

Vrompt uses the angular V mark with the tagline `SHARE. PROMPT. EVOLVE.`. The
visual system is monochrome and editorial: Inter for interface typography,
near-black `#0D0D0D` for emphasis, charcoal `#1A1A1A`, mid-gray `#4D4D4D`,
soft gray `#E6E6E6`, and white `#FFFFFF`.
```

## Requirements

- Node.js 20+
- npm 10+
- Docker Desktop for containerized development

## Quick start

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Install dependencies with `npm install`.
3. Start both apps with `npm run dev`.

## Workspace scripts

- `npm run dev` runs the web and API apps together.
- `npm run build` builds every workspace package.
- `npm run lint` runs linting across the monorepo.
- `npm run typecheck` runs TypeScript checks across the monorepo.
- `npm run test` runs unit tests across the monorepo.
- `npm run format` checks Prettier formatting.

### Database

After PostgreSQL is available, initialize the schema with:

```bash
npm run prisma:generate --workspace @vrompt/api
npm run prisma:deploy --workspace @vrompt/api
npm run prisma:seed --workspace @vrompt/api
```

### Google authentication

Phase 6 uses Google OAuth only. Create a Google OAuth Web application client,
add `http://localhost:4000/api/v1/auth/google/callback` as an authorized
redirect URI, and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.
Basic Google OAuth does not require a paid Google Cloud plan. Additional profile
details can be added later inside Vrompt.

### User profiles

Phase 7 adds public profiles at `/u/[username]` and signed-in profile editing at
`/settings`. Profiles support display names, bios, websites, public repository
and collection shelves, follower/following counts, and local avatar uploads.
Local uploads are served by the API from `/media`; production storage can use
the existing environment-aware adapter configuration.

### Categories and tags

Phase 8 seeds the official category set and exposes public category listing plus
tag search/autocomplete. Signed-in users can create normalized tags, while
category and tag edits are reserved for admins for future moderation tooling.

### Prompt repositories

Phase 9 adds repository creation with Version 1, metadata, variables, examples,
visibility, safe slugs, and up to three evidence images. Phase 10 adds the
repository detail screen at `/p/[slug]`, including prompt, examples, version,
activity, and Variant Lineage placeholders plus an accessible evidence viewer.
Phase 11 records deduplicated copy events, and Phase 12 adds immutable versions,
version history, basic comparison, and owner-only version publishing.
Phase 13 adds the consistently named Create Variant flow with prefilled editing,
creator ownership, attribution, and separate evidence for the new repository.
Phase 14 adds a bounded, cycle-safe Variant Lineage view with original, source,
child, and current repository relationships.
Phase 15 adds authenticated Save and Remove actions, idempotent bookmark counting,
and a paginated saved-repository library with newest and recently updated sorting.
Phase 16 adds authenticated Like and Unlike actions, idempotent like counting,
and viewer-specific liked state on repository detail pages.
Phase 17 adds public comment threads with shallow replies, author-only editing
and soft deletion, sanitized content, and Redis-backed creation throttling.
Phase 18 adds follow and unfollow actions, self-follow prevention, public
follower/following pagination, and viewer-specific profile follow state.
Phase 19 adds collection CRUD and archive workflows, public/private visibility,
duplicate-safe membership, ordering, and public collection detail pages.
Phase 20 adds repository search across public prompt metadata, content, creators,
categories, and tags with filters, sorting, pagination, and highlighted matches.
Phase 21 adds repository-first Explore shelves for featured, popular, recently
updated, copied, saved, and variant-rich repositories plus categories and collections.
Phase 22 turns the public homepage into a discovery entry point with strong
search, featured/popular/recent shelves, categories, collections, and create CTA.
Phase 23 adds durable repository activity events and a paginated following-only
feed for repository creation, versions, variants, and public collections.
Phase 24 adds recipient-scoped in-app notifications, unread counts, read actions,
and safe links for follows, likes, comments, replies, and variants.
Phase 25 adds repository-scoped activity history for creation, published versions,
and variants alongside the community discussion in the Activity tab.
Phase 26 adds authenticated reports for repositories, comments, and users with
moderator-owned statuses and recent duplicate-report suppression.
Phase 27 adds moderator/admin report queues, hide/restore/suspend actions,
evidence-image moderation support, and auditable moderation operations.
Phase 28 adds admin-only, filterable, paginated audit-log viewing backed by the
immutable administrative records created by moderation actions.
Phase 29 adds strict CORS origin checks, security response headers, auth
throttling, query-safe request logging, secure production cookies, and
signature-validated evidence uploads with path-safe filenames.
Phase 30 adds explicit real/starter/official account types, repeatable labeled
starter accounts, repositories, variants, collections, official categories and
tags, and discovery metric queries that exclude seeded accounts.
Phase 31 improves mobile and tablet layouts, evidence upload affordances,
responsive cards, tabs, dialogs, and touch targets. Phase 32 adds skip
navigation, visible focus, keyboard tabs/menus, modal focus trapping, and
screen-reader status/error announcements. Phase 33 adds behavioral backend
coverage across the core domain and evidence/storage boundaries. Phase 34 adds
an opt-in real-AppModule workflow test; run it with `RUN_INTEGRATION_TESTS=true`
against an isolated test database using `npm run test:integration --workspace @vrompt/api`.
Phase 35 adds a Playwright mobile browser journey covering Google-only sign-in,
profile setup, prompt and version publishing, evidence invariants, search,
copy/save/follow actions, variants, attribution, and notifications. Run it
against the mocked API boundary with `START_E2E_SERVER=true npm run test:e2e
--workspace @vrompt/web`; set `PLAYWRIGHT_EXECUTABLE_PATH` when using an
existing local Chromium binary.
Phase 37 adds an Ubuntu VPS bootstrap, Docker log rotation, firewall and
Fail2ban setup, automatic security updates, swap provisioning, and a
non-root deployment runbook in `infrastructure/vps`.
Phase 38 upgrades the edge to HTTPS-ready Nginx with HTTP redirect, TLS
termination, security headers, API rate limiting, compression, safe static
caching, WebSocket-compatible proxying, 16 MB upload limits, and a Certbot
renewal runbook in `infrastructure/https`.
Phase 39 adds PR quality gates with real database/cache services, immutable
GHCR image publishing, one-shot Prisma migration images, SSH deployment and
rollback scripts, and a health-gated GitHub Actions release workflow.
Phase 40 adds encrypted off-VPS PostgreSQL backup, checksum verification,
failure alerts, disposable restore testing, production restore safeguards, and
Cloudinary asset recovery guidance in `infrastructure/backups`.

Phase 41 adds aggregate API request, latency, authentication, evidence upload,
and storage metrics, plus a public health check and VPS monitoring script in
`infrastructure/monitoring`. Metrics intentionally exclude secrets and
identifiers; counters reset when the API restarts.

Phase 42 adds a privacy-conscious analytics ledger at `/api/v1/analytics` with
allowlisted events, sanitized metadata, authenticated/anonymous capture, and a
moderator/admin summary that excludes starter and official seeded accounts.

Phase 43 adds a private alpha task plan, evidence-comprehension prompts, tester
exit criteria, and a privacy-conscious feedback template in
`infrastructure/alpha`.

Phase 44 adds controlled-beta support intake, severity guidance, moderation and
abuse handling, daily operator checks, rollback guidance, and a redacted report
template in `infrastructure/beta`.

Phase 45 adds the MVP validation runbook and a data-pending validation report
template in `infrastructure/validation`, including cohort, conversion,
retention, evidence comprehension, quality, and launch decision gates.

Phase 46 adds the final launch audit command and release sign-off checklist in
`infrastructure/release`. The audit distinguishes automated repository checks
from external production prerequisites and does not claim launch readiness by
itself.

## Docker development

Start the development stack with source bind mounts and watch mode:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Development evidence is persisted at `./storage/evidence` on the host. Changes
to `.ts`, `.tsx`, and CSS files are picked up without rebuilding the images;
rebuild when dependencies, Dockerfiles, OS packages, or container configuration
change.

For the production-shaped stack, copy `.env.production.example` to an ignored
production environment file, fill in all required secrets, and run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Production builds run compiled Next.js/NestJS runtimes as the non-root `node`
user. Nginx is the only published service; PostgreSQL, Redis, web, and API are
internal-only. Production evidence uses Cloudinary and is not stored in a Docker
volume.

This launches:

- `vrompt-web`
- `vrompt-api`
- `vrompt-postgres`
- `vrompt-redis`

The API container applies checked-in migrations before starting the development server.

### Windows prerequisite

Docker Desktop's Linux engine requires WSL 2 and Virtual Machine Platform. If
Docker reports `Virtual Machine Platform not enabled`, open PowerShell as
Administrator in this directory and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\infrastructure\docker\enable-wsl.ps1
```

Restart Windows after the script completes, then start Docker Desktop and run
`docker compose up --build` again. If this computer is itself a virtual
machine, nested virtualization must also be enabled by the host.

## Notes

- Business features intentionally begin after this foundation.
- PostgreSQL and Redis are exposed locally for development only.
- The frontend is configured to call the API at `http://localhost:4000/api/v1` by default.
