# Phase 44 Beta Operations

The beta is a controlled public release, not an unattended launch. Publish the
support contact and status page before inviting users. Keep one operator on
rotation during the first release window and review reports at least daily.

## Support Intake

Use one canonical support channel, such as `support@vrompt.example.com` or a
private issue form. Ask for the page or action, timestamp, browser/device,
expected result, actual result, and a safe reproduction description. Never ask
users to send OAuth codes, access tokens, passwords, private prompt text, or
unredacted screenshots containing them.

## Severity

- `S1`: authentication bypass, private-content exposure, data loss, or a production outage. Page the operator and pause affected flows.
- `S2`: a core flow is unusable for many users, evidence uploads are unsafe, or authorization is incorrect. Triage within one business day.
- `S3`: a reproducible non-blocking defect or confusing interaction. Schedule it into the next fix window.
- `S4`: cosmetic issue, copy improvement, or enhancement. Track it without interrupting the release.

For reports, preserve the reporter's privacy and attach only a redacted
reproduction reference. For spam, harassment, unsafe content, copyright, or
misleading evidence, use the existing report and moderation workflow; do not
resolve the issue only through support email.

## Daily Operator Check

1. Run `infrastructure/monitoring/check-production.sh`.
2. Review API health, 5xx rate, latency, failed login count, evidence upload failures, and storage errors.
3. Review open reports and moderation actions, prioritizing safety and privacy.
4. Confirm the latest encrypted backup exists and is within the recovery point objective.
5. Sample the analytics summary, excluding `STARTER` and `OFFICIAL` activity.

## Rollback

If a release causes an S1 or widespread S2 issue, stop the rollout, keep the
database schema compatible with the previous image, and run
`infrastructure/deploy/rollback.sh` with the last known-good image tags. Do not
roll back a database migration blindly. Restore from backup only after the
incident owner confirms the recovery point and data-loss tradeoff.

Document the incident, affected window, user impact, mitigation, and follow-up
owner before resuming beta traffic.
