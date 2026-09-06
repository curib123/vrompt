# Production Monitoring

Phase 41 adds a small operational signal layer without introducing a hosted
monitoring dependency. The API exposes aggregate metrics at
`/api/v1/health/metrics`; the Nginx edge maps `/health` to the dependency health
check used by uptime monitors.

## Signals

- Public API availability and dependency health.
- Container health, CPU, memory, and host disk usage.
- Request totals, 2xx/4xx/5xx responses, average latency, and failed login attempts.
- Private attachment upload count, upload failures, upload latency, storage errors, oversized files, and rejected file types.
- Backup status file freshness.

The metrics endpoint is intentionally aggregate-only. It does not return tokens,
emails, request bodies, query strings, storage URLs, filenames, or user IDs.
Counters reset when the API process restarts; long-term reporting should scrape
the endpoint into the operator's existing monitoring system.

## Scheduling

Run `check-production.sh` from the VPS or a trusted monitoring runner. A cron
entry can run it every five minutes and route stderr/stdout to the operator's
alerting channel:

```cron
*/5 * * * * cd /opt/vrompt && VROMPT_PUBLIC_URL=https://vrompt.example.com ./infrastructure/monitoring/check-production.sh >> /var/log/vrompt-monitoring.log 2>&1
```

Set `BACKUP_STATUS_FILE` to the path written by the backup job, and set
`BACKUP_MAX_AGE_SECONDS` to match the accepted recovery point objective. The
script does not silently accept missing backup state.

For a hosted metrics service, forward only the aggregate endpoint through a
private collector or add authentication at the reverse proxy before exposing
it outside the trusted network.
