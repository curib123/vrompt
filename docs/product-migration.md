# Multi-model workspace migration

## Inventory and decisions

KEEP: NestJS/Next.js, Prisma/PostgreSQL, Redis, OAuth identities, staff credentials,
refresh tokens, User/Profile, payment adapter and verified idempotent webhook ledger,
BillingPlan/Subscription/Payment, promotions, audit trail, UI primitives, deployment.

REFACTOR: account settings, subscription entitlements, billing copy, analytics,
admin navigation, SEO, uploads, seed, tests and operator documentation.

REMOVE: prompt repositories/versions/variants, evidence images, taxonomy/audiences,
copy events, community likes/comments/follows, collections/bookmarks, notifications,
community moderation/reports, old generation service, public profile/discovery pages.

CREATE: provider/model registry, configurable routing policies and plan limits,
conversation/message/attachment domain, private Saved Prompts, streaming adapters,
atomic quota reservations/counters, immutable usage and price snapshots, extra usage,
administration and contribution reporting.

## Database and data boundary

Historical migrations remain immutable. Retain users, OAuth/staff credentials,
financial records and audit records. Extract each owner's current prompt text into
private Saved Prompts before dropping the community domain in a new migration.
Foreign keys must be removed child-first. Conversations cascade to messages/files;
accounting snapshots must survive conversation deletion. Model retirement preserves
historical usage. Money uses decimal provider costs and integer payment minor units.
Unique request IDs and user/bucket/period constraints enforce idempotency and quotas.

Do not execute destructive migration against an existing database until a database
dump and file backup have been verified. Source changes are reversible through Git;
data rollback after a drop requires the backup, not a reverse schema migration.
The current production environment example has an unrelated user edit: preserve it.

## Routes

Replace /dashboard with /chat. New /chat, /conversations, /saved-prompts, /usage.
Retain /login, /auth/callback, /staff/login, /billing, /pricing, /settings.
Remove /search, /explore, /create, /generate, /following, /collections, /notifications,
/u/*, /p/* and /prompts/*; return gone for obsolete public content rather than imply
an unrelated homepage is equivalent. Redirect only genuinely equivalent workspace
destinations. Add public /features, /models, /auto and documentation.
Private workspace routes are noindex. Admin routes are separate and role-guarded.

## Implementation order

1. Domain schema and migration, provider contracts and registry.
2. Ownership, technical limits, atomic daily/monthly reservations and accounting.
3. Streaming chat and exact manual selection; configurable Auto and safe fallback.
4. Subscription entitlements, additional usage and private files.
5. Replace frontend, admin and public surfaces; remove legacy code/dependencies.
6. Migration, concurrency, provider protocol, authorization, billing and browser tests.

## Operational configuration

No assumed model IDs, prices or production allowances. Administrators configure
verified provider IDs, capabilities, prices, limits and effective dates before
enabling models. Credentials remain environment-only. Providers without credentials
are unavailable, never simulated. UTC calendar days/months define usage resets.
Cancelled/partial requests retain accounting; provider usage absent after disconnect
must be marked estimated/unknown rather than reported as a verified zero expense.
