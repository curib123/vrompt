ALTER TABLE "AiGeneration"
ADD COLUMN "providerResponseId" VARCHAR(255),
ADD COLUMN "inputTokens" INTEGER,
ADD COLUMN "outputTokens" INTEGER,
ADD COLUMN "totalTokens" INTEGER,
ADD COLUMN "reviewDecision" VARCHAR(20),
ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "AiGeneration_providerResponseId_key"
ON "AiGeneration"("providerResponseId");
