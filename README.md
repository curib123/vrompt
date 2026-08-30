# Vrompt

Vrompt is the repository for AI prompts. This workspace contains the Phase 1 through Phase 10 MVP foundation: a TypeScript monorepo, a Next.js frontend shell, a NestJS API shell, a normalized Prisma/PostgreSQL data model, media storage adapters, Google-only authentication, user profiles, prompt organization, repository creation, and repository detail pages.

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

## Docker development

Start the full local stack with:

```bash
docker compose up --build
```

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
