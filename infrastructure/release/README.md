# Launch Audit

Run `phase1-audit.sh` from the repository root before a production decision. It
checks deployment, backup, monitoring, migration, and CI configuration,
renders production Compose when `.env.production` is available, rejects exposed
PostgreSQL/Redis ports, and checks the configured public health endpoint.

## Required sign-offs

- Desktop, tablet, and mobile smoke tests pass for sign-in, chat, Auto, manual model selection, stop/regenerate, files, Saved Prompts, usage, billing, and admin authorization.
- OAuth callback state, refresh, logout, and account suspension behavior are verified.
- Private conversations, attachments, usage records, and admin routes are tested with separate accounts.
- Provider failure, fallback, timeout, cancellation, unsupported-file, and quota-limit behavior are verified.
- API/web tests, typecheck, lint, and production builds are green for the release commit.
- HTTPS, redirect, security headers, CORS, cookies, and rate limits are verified externally.
- The retirement migration runs once against a backup-tested database and remains compatible with the rollback image.
- Backup encryption, off-host upload, checksum verification, retention, and restore testing have current evidence.
- Monitoring alerts cover downtime, unhealthy containers, disk/memory limits, provider failures, 5xx/latency, auth failures, storage failures, and stale backups.

Keep release decisions and external verification results in your release tracker.
