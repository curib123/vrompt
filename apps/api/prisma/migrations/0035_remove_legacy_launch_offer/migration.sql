-- Retire the automatic sample discount inserted by migration 0020.
-- Preserve any financial references to it; no artificial launch scarcity.
UPDATE "Promotion" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE id = '40000000-0000-4000-8000-000000000001'
  AND name = 'Pro launch offer' AND "discountValue" = 70;
