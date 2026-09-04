UPDATE "BillingPlan"
SET "currency" = 'USD',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('FREE', 'PRO');

UPDATE "BillingPlan"
SET "originalPrice" = 599,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PRO';
