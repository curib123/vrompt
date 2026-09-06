-- Remove only identities created by the retired development seed. Real OAuth
-- identities, administrators and current workspace configuration are retained.
BEGIN;
DELETE FROM "User" u
WHERE u.role = 'USER'
  AND (u.email LIKE '%@seed.vrompt.local'
    OR u.email IN ('official@vrompt.local', 'starter@vrompt.local', 'prompt-lab@vrompt.local')
    OR (u.username LIKE 'demo-creator-%' AND u.email LIKE '%@vrompt.local'))
  AND EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id AND i."providerUserId" LIKE 'seed:%')
  AND NOT EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id AND i."providerUserId" NOT LIKE 'seed:%')
  AND NOT EXISTS (SELECT 1 FROM "BillingPayment" p WHERE p."userId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "BillingSubscription" s WHERE s."userId" = u.id);

-- Retired demo moderator bootstrap, never a real OAuth identity.
DELETE FROM "User" u
WHERE u.role = 'MODERATOR' AND u."accountType" = 'OFFICIAL'
  AND u.email = 'moderator@vrompt.example.com'
  AND NOT EXISTS (SELECT 1 FROM "UserIdentity" i WHERE i."userId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "BillingPayment" p WHERE p."userId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "BillingSubscription" s WHERE s."userId" = u.id);

DELETE FROM "FeatureDefinition" WHERE key = 'ai.generation';
COMMIT;
