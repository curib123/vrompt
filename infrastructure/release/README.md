# Phase 46 Launch Audit

Run `phase1-audit.sh` from the repository root before a production decision.
It checks required deployment, backup, monitoring, migration, CI, and
validation artifacts; renders production Compose when `.env.production` is
available; rejects exposed PostgreSQL/Redis ports; and checks `/health` when
`VROMPT_PUBLIC_URL` is set.

Warnings are intentionally not treated as passes. An audit can be automated,
but launch approval still requires an owner to record the evidence below.

## Required Sign-Offs

- Desktop, tablet, and mobile smoke tests pass for browse, search, create, edit, publish, copy, save, like, follow, comment, collections, notifications, reports, and moderation.
- Google OAuth sign-in, callback state validation, refresh, logout, and account suspension behavior are verified with production callback URLs.
- Private, unlisted, public, repository, version, evidence, collection, and admin authorization cases are tested with separate accounts.
- Prompt version history, Variant lineage, evidence alt text, evidence visibility, and unsupported/oversized media handling are verified.
- API/web unit, typecheck, lint, build, integration, and E2E checks are green for the release commit.
- HTTPS certificates, HTTP redirect, security headers, CORS origin, cookie settings, and rate limits are verified from outside the VPS.
- Production migration runs once against a backup-tested database and is compatible with rollback images.
- Backup encryption, off-VPS upload, checksum verification, retention, and disposable restore test have current evidence.
- Monitoring alerts are routed for downtime, unhealthy containers, disk/memory limits, 5xx/latency, auth failures, evidence/storage failures, and stale backups.
- Analytics summary is reviewed with seeded accounts excluded and no personal or prompt content exposed.

## Release Record

Release commit:
Audit date (UTC):
Audit owner:
Automated audit output:
Open S1/S2 issues:
Rollback image tags:
Backup restore evidence:
External smoke-test evidence:
Decision: `launch` / `hold` / `rollback`
Decision notes:

Do not mark this phase complete from a local green build alone. Production
credentials, DNS, Google OAuth client configuration, Cloudinary, VPS access,
backup storage, alert routing, and real tester evidence are external
prerequisites and must be verified by the deployment owner.
