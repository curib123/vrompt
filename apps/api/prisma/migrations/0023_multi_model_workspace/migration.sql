-- CreateEnum
CREATE TYPE "ModelProvider" AS ENUM ('OPENAI', 'GOOGLE', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "RoutingMode" AS ENUM ('AUTO', 'MANUAL', 'FALLBACK');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('RESERVED', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'INTERRUPTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditTargetType" ADD VALUE 'MODEL';
ALTER TYPE "AuditTargetType" ADD VALUE 'GENERATION_POLICY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'MODEL_CONFIGURED';
ALTER TYPE "AuditActionType" ADD VALUE 'GENERATION_POLICY_CONFIGURED';

-- CreateTable
CREATE TABLE "AIModel" (
    "id" UUID NOT NULL,
    "provider" "ModelProvider" NOT NULL,
    "providerModelId" VARCHAR(160) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "category" VARCHAR(40) NOT NULL DEFAULT 'general',
    "capabilities" TEXT[] DEFAULT ARRAY['text']::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "manualAvailable" BOOLEAN NOT NULL DEFAULT true,
    "autoAvailable" BOOLEAN NOT NULL DEFAULT false,
    "maintenance" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "qualityTier" INTEGER NOT NULL DEFAULT 1,
    "routingPriority" INTEGER NOT NULL DEFAULT 0,
    "routingCostScore" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "inputPrice" DECIMAL(18,8) NOT NULL,
    "cachedInputPrice" DECIMAL(18,8) NOT NULL,
    "outputPrice" DECIMAL(18,8) NOT NULL,
    "additionalPrices" JSONB NOT NULL DEFAULT '{}',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "maxContext" INTEGER NOT NULL,
    "maxOutput" INTEGER NOT NULL,
    "fallbackId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationPolicy" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "bucket" VARCHAR(80) NOT NULL,
    "modelId" UUID,
    "dailyLimit" INTEGER NOT NULL,
    "monthlyLimit" INTEGER NOT NULL,
    "maxInputChars" INTEGER NOT NULL,
    "maxContext" INTEGER NOT NULL,
    "maxOutput" INTEGER NOT NULL,
    "maxFiles" INTEGER NOT NULL,
    "maxFileBytes" INTEGER NOT NULL,
    "maxDurationSeconds" INTEGER NOT NULL,
    "concurrency" INTEGER NOT NULL,
    "ratePerMinute" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "routing" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL DEFAULT 'New conversation',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "modelName" VARCHAR(160),
    "provider" "ModelProvider",
    "routingMode" "RoutingMode",
    "generationId" UUID,
    "status" "GenerationStatus" NOT NULL DEFAULT 'SUCCEEDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPrompt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "mimeType" VARCHAR(80) NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bucket" VARCHAR(80) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "period" "UsageResetPeriod" NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "extra" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaReservation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bucket" VARCHAR(80) NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "dayStart" TIMESTAMP(3) NOT NULL,
    "monthStart" TIMESTAMP(3) NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'RESERVED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "QuotaReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "subscriptionId" UUID,
    "conversationId" UUID,
    "messageId" UUID,
    "provider" "ModelProvider" NOT NULL,
    "modelId" UUID NOT NULL,
    "providerModelId" VARCHAR(160) NOT NULL,
    "modelName" VARCHAR(160) NOT NULL,
    "routingMode" "RoutingMode" NOT NULL,
    "originalModelId" UUID,
    "fallbackReason" VARCHAR(100),
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
    "providerUsage" JSONB NOT NULL,
    "pricingSnapshot" JSONB NOT NULL,
    "estimatedCost" DECIMAL(18,8) NOT NULL,
    "costEstimated" BOOLEAN NOT NULL DEFAULT false,
    "currency" CHAR(3) NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "status" "GenerationStatus" NOT NULL,
    "errorCategory" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIModel_enabled_maintenance_displayOrder_idx" ON "AIModel"("enabled", "maintenance", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_provider_providerModelId_key" ON "AIModel"("provider", "providerModelId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationPolicy_planId_bucket_key" ON "GenerationPolicy"("planId", "bucket");

-- CreateIndex
CREATE INDEX "Conversation_userId_archived_updatedAt_idx" ON "Conversation"("userId", "archived", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_generationId_key" ON "Message"("generationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedPrompt_userId_updatedAt_idx" ON "SavedPrompt"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "Attachment_userId_conversationId_idx" ON "Attachment"("userId", "conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageCounter_userId_bucket_period_periodStart_key" ON "UsageCounter"("userId", "bucket", "period", "periodStart");

-- CreateIndex
CREATE INDEX "QuotaReservation_userId_status_expiresAt_idx" ON "QuotaReservation"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_createdAt_idx" ON "UsageRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_requestId_idx" ON "UsageRecord"("requestId");

-- CreateIndex
CREATE INDEX "UsageRecord_modelId_createdAt_idx" ON "UsageRecord"("modelId", "createdAt");

-- AddForeignKey
ALTER TABLE "AIModel" ADD CONSTRAINT "AIModel_fallbackId_fkey" FOREIGN KEY ("fallbackId") REFERENCES "AIModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationPolicy" ADD CONSTRAINT "GenerationPolicy_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationPolicy" ADD CONSTRAINT "GenerationPolicy_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPrompt" ADD CONSTRAINT "SavedPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaReservation" ADD CONSTRAINT "QuotaReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
