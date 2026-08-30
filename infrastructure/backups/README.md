# Vrompt Backups and Recovery

Phase 40 backs up PostgreSQL metadata outside the primary VPS. The backup is a
plain SQL dump compressed with gzip and encrypted with `age` before upload to an
`rclone` remote. The scripts never upload Cloudinary credentials or store an
unencrypted dump on the remote.

## Daily backup

Install `age`, `rclone`, and `curl` on the VPS. Configure an encrypted rclone
remote and a root-owned age recipient. Run the backup from `/srv/vrompt`:

```bash
BACKUP_REMOTE=s3-vrompt:backups/postgres \
BACKUP_AGE_RECIPIENT=age1... \
BACKUP_RETENTION_DAYS=90 \
./infrastructure/backups/backup-postgres.sh
```

The remote storage must be outside the primary VPS and encrypted at rest. Run
the script daily from a root-owned systemd timer or cron entry. `90` days is a
simple floor that covers the suggested 7 daily, 4 weekly, and 3 monthly
restore points; configure lifecycle rules or a scheduled pruning job if exact
tiers are required. Set `BACKUP_ALERT_WEBHOOK` for a failure notification.

## Test restore

Do not treat backups as complete until a restore has succeeded. Download one
backup and run the disposable restore test on a host with Docker:

```bash
BACKUP_FILE=/secure/path/vrompt-postgres-<timestamp>.sql.gz.age \
BACKUP_AGE_IDENTITY=/secure/path/age-identity.txt \
./infrastructure/backups/test-restore.sh
```

The script restores into a temporary PostgreSQL 16 container, verifies that
public tables exist, and removes the container in an exit trap. Record the
date, backup name, checksum result, and table count in the operations log.

## Production restore

Pause application writes, take a current backup if the database is reachable,
and obtain an explicit operator confirmation before using
`restore-postgres.sh`:

```bash
ALLOW_PRODUCTION_RESTORE=true \
BACKUP_REMOTE=s3-vrompt:backups/postgres \
BACKUP_AGE_IDENTITY=/secure/path/age-identity.txt \
BACKUP_NAME=vrompt-postgres-<timestamp>.sql.gz.age \
./infrastructure/backups/restore-postgres.sh
```

Restart the application, verify `/health`, sign-in, repository reads, prompt
copies, and evidence metadata, then record the restore outcome.

## Cloudinary recovery

The database backup preserves evidence metadata, `storageKey`, provider, and
Cloudinary URLs; it does not copy Cloudinary objects. Configure Cloudinary
asset retention/versioning and keep the Cloudinary account recovery details in
the provider's secure vault. If an asset is lost, identify affected records
from `PromptEvidenceImage`, restore or re-upload the asset in Cloudinary, and
update the metadata through a controlled migration. A database restore alone
must not be called media recovery.
