-- Required production configuration: deploy migrations, never development seeds.
-- Prices in USD per million tokens, verified against provider docs 2026-09-06.
-- Existing administrator-edited rows and policy limits are preserved.
BEGIN;
CREATE TEMP TABLE launch_models (
  provider "ModelProvider", model text, name text, description text,
  input numeric, cached numeric, output numeric, context integer, max_output integer,
  capabilities text[], priority integer
);
INSERT INTO launch_models VALUES
  ('OPENAI', 'gpt-4o-mini', 'GPT-4o mini', 'Fast, economical everyday assistance.', .15, .075, .6, 128000, 4096, ARRAY['text','vision','files','coding'], 30),
  ('GOOGLE', 'gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', 'Efficient chat, writing and document understanding.', .1, .01, .4, 1048576, 8192, ARRAY['text','vision','files','coding','long_context'], 20),
  ('ANTHROPIC', 'claude-haiku-4-5-20251001', 'Claude Haiku 4.5', 'Writing, coding and thoughtful analysis.', 1, .1, 5, 200000, 8192, ARRAY['text','vision','files','coding','reasoning','prompt_caching'], 10),
  ('MISTRAL', 'mistral-small-latest', 'Mistral Small', 'Efficient general-purpose chat.', .1, .03, .3, 128000, 4096, ARRAY['text','vision','coding'], 15),
  ('GROQ', 'openai/gpt-oss-20b', 'GPT-OSS 20B', 'Fast open-weight reasoning and coding, hosted by Groq.', .075, .075, .3, 131072, 8192, ARRAY['text','coding','reasoning'], 25);

INSERT INTO "AIModel" ("id", "provider", "providerModelId", "displayName", "description", "capabilities", "enabled", "autoAvailable", "qualityTier", "routingPriority", "routingCostScore", "inputPrice", "cachedInputPrice", "outputPrice", "additionalPrices", "maxContext", "maxOutput", "updatedAt")
SELECT gen_random_uuid(), provider, model, name, description, capabilities, true, true, 2, priority,
  input + output, input, cached, output,
  CASE WHEN provider = 'ANTHROPIC' THEN '{"cacheWriteInputPrice":1.25}'::jsonb ELSE '{}'::jsonb END,
  context, max_output, now() FROM launch_models
ON CONFLICT ("provider", "providerModelId") DO NOTHING;

-- Replace retired IDs in existing plan pools without widening custom pools.
CREATE TEMP TABLE retired_replacements AS
SELECT old.id AS old_id, replacement.id AS new_id
FROM "AIModel" old JOIN "AIModel" replacement ON old.provider = replacement.provider
WHERE (old."providerModelId" = 'gemini-2.0-flash' AND replacement."providerModelId" = 'gemini-2.5-flash-lite')
   OR (old."providerModelId" IN ('claude-3-5-haiku-latest', 'claude-3-5-haiku-20241022') AND replacement."providerModelId" = 'claude-haiku-4-5-20251001');
UPDATE "GenerationPolicy" p SET routing = jsonb_set(p.routing, '{allowedModelIds}',
  (SELECT COALESCE(jsonb_agg(DISTINCT COALESCE(r.new_id::text, member.id)), '[]'::jsonb)
   FROM jsonb_array_elements_text(p.routing->'allowedModelIds') member(id)
   LEFT JOIN retired_replacements r ON r.old_id::text = member.id)), "updatedAt" = now()
WHERE jsonb_typeof(p.routing->'allowedModelIds') = 'array';
UPDATE "AIModel" SET enabled = false, "updatedAt" = now()
WHERE id IN (SELECT old_id FROM retired_replacements);

-- Extend only the original two-model starter pool; custom pools stay explicit.
UPDATE "GenerationPolicy" p SET routing = jsonb_set(p.routing, '{allowedModelIds}',
  (SELECT jsonb_agg(m.id::text) FROM "AIModel" m JOIN launch_models l ON l.provider = m.provider AND l.model = m."providerModelId"
   WHERE m.enabled AND m."autoAvailable")), "updatedAt" = now()
WHERE p.bucket = 'AUTO' AND p."planId" IN (SELECT id FROM "BillingPlan" WHERE code IN ('FREE','PRO','GUEST'))
AND (p.routing->'allowedModelIds') @> (SELECT jsonb_agg(id::text) FROM "AIModel" WHERE "providerModelId" IN ('gpt-4o-mini','gemini-2.5-flash-lite'))
AND jsonb_array_length(p.routing->'allowedModelIds') = 2;

-- The original Pro pool included all five development starter models.
UPDATE "GenerationPolicy" p SET routing = jsonb_set(p.routing, '{allowedModelIds}',
  (p.routing->'allowedModelIds') || (SELECT jsonb_build_array(id::text) FROM "AIModel" WHERE provider = 'GROQ' AND "providerModelId" = 'openai/gpt-oss-20b')), "updatedAt" = now()
WHERE p.bucket = 'AUTO' AND p."planId" IN (SELECT id FROM "BillingPlan" WHERE code = 'PRO')
AND jsonb_array_length(p.routing->'allowedModelIds') = 5
AND (p.routing->'allowedModelIds') <@ (SELECT jsonb_agg(id::text) FROM "AIModel" WHERE "providerModelId" IN ('gpt-4o-mini','gemini-2.5-flash-lite','claude-haiku-4-5-20251001','mistral-small-latest','gemini-2.5-flash-image'));

-- Missing policies on a fresh production database receive bounded defaults.
INSERT INTO "GenerationPolicy" (id, "planId", bucket, "dailyLimit", "monthlyLimit", "maxInputChars", "maxContext", "maxOutput", "maxFiles", "maxFileBytes", "maxDurationSeconds", concurrency, "ratePerMinute", routing, "updatedAt")
SELECT gen_random_uuid(), p.id, 'AUTO', CASE WHEN p.code = 'FREE' THEN 20 ELSE 200 END,
  CASE WHEN p.code = 'FREE' THEN 200 ELSE 5000 END, CASE WHEN p.code = 'FREE' THEN 12000 ELSE 50000 END,
  CASE WHEN p.code = 'FREE' THEN 32000 ELSE 128000 END, CASE WHEN p.code = 'FREE' THEN 2048 ELSE 8192 END,
  CASE WHEN p.code = 'FREE' THEN 1 ELSE 5 END, 5000000, 90, CASE WHEN p.code = 'FREE' THEN 1 ELSE 3 END,
  CASE WHEN p.code = 'FREE' THEN 6 ELSE 30 END,
  jsonb_build_object('allowedModelIds', (SELECT jsonb_agg(m.id::text) FROM "AIModel" m JOIN launch_models l ON l.provider = m.provider AND l.model = m."providerModelId" WHERE m.enabled AND m."autoAvailable"),
    'minimumQualityTier', 1, 'costWeight', 1, 'maxAttempts', 3, 'attemptTimeoutSeconds', 30,
    'rules', '[{"task":"coding","keywords":["debug","refactor","algorithm","code"],"qualityTier":2,"capabilities":["coding"]},{"task":"reasoning","keywords":["prove","reason step by step","complex analysis"],"qualityTier":2,"capabilities":["reasoning"]}]'::jsonb), now()
FROM "BillingPlan" p WHERE p.code IN ('FREE','PRO')
ON CONFLICT ("planId", bucket) DO NOTHING;

-- Manual selection shares the same monthly credit wallet as Auto. Add policies
-- only for models already allowed in that plan's Auto pool, never custom pools.
INSERT INTO "GenerationPolicy" (id, "planId", bucket, "modelId", "dailyLimit", "monthlyLimit", "maxInputChars", "maxContext", "maxOutput", "maxFiles", "maxFileBytes", "maxDurationSeconds", concurrency, "ratePerMinute", enabled, routing, "updatedAt")
SELECT gen_random_uuid(), p."planId", m.id::text, m.id, p."dailyLimit", p."monthlyLimit", p."maxInputChars", p."maxContext", p."maxOutput", p."maxFiles", p."maxFileBytes", p."maxDurationSeconds", p.concurrency, p."ratePerMinute", p.enabled, p.routing, now()
FROM "GenerationPolicy" p JOIN "BillingPlan" b ON b.id = p."planId"
JOIN "AIModel" m ON (p.routing->'allowedModelIds') ? m.id::text
JOIN launch_models l ON l.provider = m.provider AND l.model = m."providerModelId"
WHERE p.bucket = 'AUTO' AND b.code IN ('FREE','PRO') AND m.enabled AND m."manualAvailable"
ON CONFLICT ("planId", bucket) DO NOTHING;

DROP TABLE retired_replacements;
DROP TABLE launch_models;
COMMIT;
