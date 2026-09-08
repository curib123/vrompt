-- Keep historical model and usage identities; remove Groq from live offerings.
UPDATE "AIModel" SET enabled = false, "autoAvailable" = false,
  "manualAvailable" = false, "updatedAt" = now() WHERE provider = 'GROQ';
UPDATE "GenerationPolicy" SET enabled = false, "updatedAt" = now()
WHERE "modelId" IN (SELECT id FROM "AIModel" WHERE provider = 'GROQ');
UPDATE "GenerationPolicy" p SET routing = jsonb_set(p.routing, '{allowedModelIds}',
  COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(p.routing->'allowedModelIds')
    WHERE value #>> '{}' NOT IN (SELECT id::text FROM "AIModel" WHERE provider = 'GROQ')), '[]'::jsonb)),
  "updatedAt" = now()
WHERE jsonb_typeof(p.routing->'allowedModelIds') = 'array';
