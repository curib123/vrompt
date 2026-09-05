# Controlled Beta Operations

The beta is a monitored release. Publish a support channel and status page,
keep an operator on rotation during the first release window, and review reports
at least daily.

## Support intake

Ask for the page or action, timestamp, browser/device, expected result, actual
result, and a safe reproduction description. Never request OAuth codes, access
tokens, passwords, private chat text, or unredacted screenshots.

## Severity

- `S1`: authentication bypass, private-content exposure, data loss, or outage.
- `S2`: chat, model routing, file authorization, quota, or billing is unusable.
- `S3`: reproducible non-blocking defect or confusing interaction.
- `S4`: cosmetic issue, copy improvement, or enhancement.

## Daily operator check

1. Run `infrastructure/monitoring/check-production.sh`.
2. Review health, 5xx rate, latency, failed logins, provider failures, quota errors, and storage errors.
3. Review usage records and billing webhook failures.
4. Confirm the latest encrypted backup exists within the recovery point objective.
5. Sample admin model configuration and verify disabled models are not selectable.

## Rollback

For an S1 or widespread S2 issue, stop the rollout and use
`infrastructure/deploy/rollback.sh` with the last known-good image tags. Do not
roll back a database migration blindly; restore from a verified backup only after
the incident owner confirms the recovery point and data-loss tradeoff.
