# Vrompt Backups and Recovery

The backup scripts preserve PostgreSQL data outside the primary VPS. The backup is a
plain SQL dump compressed with gzip and encrypted with `age` before upload to an
`rclone` remote. The scripts never upload provider credentials or store an
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

Restart the application and verify `/health`, sign-in, conversations, usage, and
private attachment downloads, then record the restore outcome.

## Private file recovery

Database dumps preserve attachment metadata but do not contain attachment bytes.
Back up the `vrompt-private-files` Docker volume separately using encrypted,
access-controlled storage. Restore the matching file backup alongside the database
and verify that another account cannot download the restored files. Keep existing
legacy evidence backups according to your retention policy; they are not served
by the current application.
