-- Retain historical identities and usage, but do not grant guest access.
UPDATE "BillingPlan" SET "isActive" = false, "updatedAt" = now() WHERE code = 'GUEST';
UPDATE "GenerationPolicy" SET enabled = false, "updatedAt" = now()
WHERE "planId" IN (SELECT id FROM "BillingPlan" WHERE code = 'GUEST');
