-- Freeze the current pool so enabling a future model does not grant every plan access.
-- Missing pools fail closed in application code; empty pools intentionally disable Auto.
UPDATE "GenerationPolicy"
SET "routing" = "routing" || jsonb_build_object('allowedModelIds',
  CASE WHEN "bucket" = 'AUTO' THEN
    (SELECT COALESCE(jsonb_agg("id"::text ORDER BY "id"), '[]'::jsonb)
     FROM "AIModel" WHERE "enabled" = true AND "autoAvailable" = true)
  ELSE '[]'::jsonb END)
WHERE NOT ("routing" ? 'allowedModelIds');
