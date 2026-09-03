CREATE TYPE "MembershipPlan" AS ENUM ('FREE', 'PREMIUM');
CREATE TYPE "PromptOrigin" AS ENUM ('COMMUNITY', 'AI_GENERATED', 'IMPORTED');
CREATE TYPE "AiGenerationMode" AS ENUM ('PUBLIC', 'INTERNAL');
CREATE TYPE "AiGenerationOperation" AS ENUM ('GENERATE', 'REGENERATE', 'IMPROVE', 'EXPAND', 'SHORTEN');
CREATE TYPE "AiGenerationStatus" AS ENUM ('REQUESTED', 'SUCCEEDED', 'FAILED', 'REJECTED');

ALTER TABLE "User" ADD COLUMN "plan" "MembershipPlan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "PromptRepository" ADD COLUMN "origin" "PromptOrigin" NOT NULL DEFAULT 'COMMUNITY';

CREATE TABLE "AiGeneration" (
    "id" UUID NOT NULL,
    "requesterId" UUID,
    "repositoryId" UUID,
    "mode" "AiGenerationMode" NOT NULL,
    "operation" "AiGenerationOperation" NOT NULL,
    "status" "AiGenerationStatus" NOT NULL DEFAULT 'REQUESTED',
    "goal" TEXT NOT NULL,
    "categorySlug" VARCHAR(100),
    "audienceSlug" VARCHAR(100),
    "input" JSONB NOT NULL,
    "output" JSONB,
    "providerModel" VARCHAR(120),
    "errorCode" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiUsageEvent" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "generationId" UUID,
    "subjectKey" VARCHAR(180) NOT NULL,
    "requestKey" VARCHAR(255) NOT NULL,
    "mode" "AiGenerationMode" NOT NULL,
    "operation" "AiGenerationOperation" NOT NULL,
    "status" "AiGenerationStatus" NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiQuotaBucket" (
    "id" UUID NOT NULL,
    "subjectKey" VARCHAR(180) NOT NULL,
    "periodStart" DATE NOT NULL,
    "publicUsed" INTEGER NOT NULL DEFAULT 0,
    "internalUsed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiQuotaBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUsageEvent_requestKey_key" ON "AiUsageEvent"("requestKey");
CREATE INDEX "AiGeneration_requesterId_createdAt_idx" ON "AiGeneration"("requesterId", "createdAt");
CREATE INDEX "AiGeneration_mode_status_createdAt_idx" ON "AiGeneration"("mode", "status", "createdAt");
CREATE INDEX "AiGeneration_repositoryId_idx" ON "AiGeneration"("repositoryId");
CREATE INDEX "AiUsageEvent_subjectKey_createdAt_idx" ON "AiUsageEvent"("subjectKey", "createdAt");
CREATE INDEX "AiUsageEvent_userId_createdAt_idx" ON "AiUsageEvent"("userId", "createdAt");
CREATE INDEX "AiUsageEvent_mode_status_createdAt_idx" ON "AiUsageEvent"("mode", "status", "createdAt");
CREATE UNIQUE INDEX "AiQuotaBucket_subjectKey_periodStart_key" ON "AiQuotaBucket"("subjectKey", "periodStart");
CREATE INDEX "AiQuotaBucket_periodStart_subjectKey_idx" ON "AiQuotaBucket"("periodStart", "subjectKey");

ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "PromptRepository"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "AiGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
