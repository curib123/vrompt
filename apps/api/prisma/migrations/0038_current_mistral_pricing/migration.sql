-- Correct only the original starter rate card for the current Mistral Small alias.
-- https://docs.mistral.ai/inference/pricing (2026-09-06).
UPDATE "AIModel" SET "inputPrice" = .15, "cachedInputPrice" = .015,
  "outputPrice" = .6, "updatedAt" = now()
WHERE provider = 'MISTRAL' AND "providerModelId" = 'mistral-small-latest'
  AND "inputPrice" = .1 AND "cachedInputPrice" = .03 AND "outputPrice" = .3;
