# Phase 45 MVP Validation

Validate the MVP with real alpha and beta activity, not seeded content or
assumptions. Use the admin analytics summary for event counts and supplement it
with the database queries below when cohort detail is needed. Filter out
`STARTER` and `OFFICIAL` accounts; anonymous events may be included for the
top-of-funnel view but must be labeled separately.

## Core Metrics

- Activation: unique actors with `repository_viewed`, `search_performed`, or `prompt_copied` divided by unique eligible visitors.
- Creation conversion: unique actors with `repository_published` divided by activated actors.
- Collaboration conversion: unique actors with `prompt_saved`, `follow_created`, `comment_created`, or `collection_created` divided by activated actors.
- Evidence comprehension: successful answers to the alpha evidence questions, reported as correct answers divided by completed responses.
- Retention: actors active in a later 7-day window divided by actors active in the first 7-day window.
- Quality: S1/S2 defects, unauthorized-access defects, data-loss incidents, and evidence safety reports per release window.

## Query Shape

Run against a read-only database connection and replace the timestamps with
the agreed UTC validation window:

```sql
-- Eligible event activity, excluding seeded accounts.
SELECT "name", COUNT(*) AS event_count, COUNT(DISTINCT "actorId") AS actors
FROM "AnalyticsEvent"
WHERE "createdAt" >= :from_utc
  AND "createdAt" < :to_utc
  AND ("accountType" IS NULL OR "accountType" = 'REAL')
GROUP BY "name"
ORDER BY event_count DESC;

-- Seven-day returning actors.
WITH first_window AS (
  SELECT DISTINCT "actorId"
  FROM "AnalyticsEvent"
  WHERE "actorId" IS NOT NULL
    AND "accountType" = 'REAL'
    AND "createdAt" >= :from_utc
    AND "createdAt" < :from_utc + INTERVAL '7 days'
), later_window AS (
  SELECT DISTINCT "actorId"
  FROM "AnalyticsEvent"
  WHERE "actorId" IS NOT NULL
    AND "accountType" = 'REAL'
    AND "createdAt" >= :from_utc + INTERVAL '7 days'
    AND "createdAt" < :from_utc + INTERVAL '14 days'
)
SELECT COUNT(*) AS first_window_actors,
       COUNT(later_window."actorId") AS returning_actors
FROM first_window
LEFT JOIN later_window USING ("actorId");
```

Record the denominator, numerator, time window, account filter, and query
version with every reported percentage. Suppress small cohorts in public
reports to avoid making individual behavior identifiable.

## Decision Gate

Ship only when the report has at least 5 completed alpha testers, no unresolved
S1/S2 privacy or authorization issue, a successful backup restore rehearsal,
and a team-reviewed evidence comprehension result. If a threshold is not met,
write the smallest next experiment and owner rather than rounding the result
up to a pass.
