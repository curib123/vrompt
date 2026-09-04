CREATE TYPE "BillingInterval" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR', 'ONE_TIME');
CREATE TYPE "UsageResetPeriod" AS ENUM ('DAILY', 'MONTHLY');
CREATE TYPE "PromotionMode" AS ENUM ('AUTOMATIC', 'CODE');

CREATE TABLE "BillingPlan" (
  "id" UUID NOT NULL, "code" VARCHAR(50) NOT NULL, "legacyPlan" "MembershipPlan",
  "name" VARCHAR(100) NOT NULL, "description" TEXT NOT NULL, "originalPrice" INTEGER NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'PHP', "billingInterval" "BillingInterval" NOT NULL,
  "intervalCount" INTEGER NOT NULL DEFAULT 1, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingPlan_code_key" ON "BillingPlan"("code");
CREATE INDEX "BillingPlan_isActive_displayOrder_idx" ON "BillingPlan"("isActive", "displayOrder");

CREATE TABLE "FeatureDefinition" (
  "id" UUID NOT NULL, "key" VARCHAR(80) NOT NULL, "name" VARCHAR(120) NOT NULL,
  "description" TEXT, "unitLabel" VARCHAR(40) NOT NULL DEFAULT 'uses', "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeatureDefinition_key_key" ON "FeatureDefinition"("key");

CREATE TABLE "PlanFeatureLimit" (
  "id" UUID NOT NULL, "planId" UUID NOT NULL, "featureId" UUID NOT NULL,
  "resetPeriod" "UsageResetPeriod" NOT NULL, "limit" INTEGER, "warningAt" INTEGER NOT NULL DEFAULT 80,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanFeatureLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlanFeatureLimit_planId_featureId_resetPeriod_key" ON "PlanFeatureLimit"("planId", "featureId", "resetPeriod");
CREATE INDEX "PlanFeatureLimit_featureId_planId_idx" ON "PlanFeatureLimit"("featureId", "planId");

CREATE TABLE "Promotion" (
  "id" UUID NOT NULL, "name" VARCHAR(120) NOT NULL, "code" VARCHAR(80), "description" TEXT,
  "discountType" "DiscountType" NOT NULL, "discountValue" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
  "isActive" BOOLEAN NOT NULL DEFAULT true, "mode" "PromotionMode" NOT NULL DEFAULT 'AUTOMATIC',
  "maximumRedemptions" INTEGER, "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "perUserRedemptionLimit" INTEGER, "newUsersOnly" BOOLEAN NOT NULL DEFAULT false, "minimumPurchase" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");
CREATE INDEX "Promotion_isActive_mode_startsAt_endsAt_idx" ON "Promotion"("isActive", "mode", "startsAt", "endsAt");

CREATE TABLE "PromotionPlan" ("promotionId" UUID NOT NULL, "planId" UUID NOT NULL, CONSTRAINT "PromotionPlan_pkey" PRIMARY KEY ("promotionId", "planId"));
CREATE TABLE "PromotionRedemption" (
  "id" UUID NOT NULL, "promotionId" UUID NOT NULL, "userId" UUID NOT NULL, "paymentId" UUID NOT NULL,
  "amount" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromotionRedemption_paymentId_key" ON "PromotionRedemption"("paymentId");
CREATE INDEX "PromotionRedemption_promotionId_userId_createdAt_idx" ON "PromotionRedemption"("promotionId", "userId", "createdAt");

CREATE TABLE "FeatureUsageBucket" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "featureId" UUID NOT NULL, "resetPeriod" "UsageResetPeriod" NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL, "periodEnd" TIMESTAMP(3) NOT NULL, "used" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "FeatureUsageBucket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeatureUsageBucket_userId_featureId_resetPeriod_periodStart_key" ON "FeatureUsageBucket"("userId", "featureId", "resetPeriod", "periodStart");
CREATE INDEX "FeatureUsageBucket_userId_periodEnd_idx" ON "FeatureUsageBucket"("userId", "periodEnd");

CREATE TABLE "FeatureUsageEvent" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "featureId" UUID NOT NULL, "bucketId" UUID NOT NULL,
  "requestKey" VARCHAR(255) NOT NULL, "units" INTEGER NOT NULL DEFAULT 1, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "FeatureUsageEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeatureUsageEvent_requestKey_key" ON "FeatureUsageEvent"("requestKey");
CREATE INDEX "FeatureUsageEvent_userId_featureId_createdAt_idx" ON "FeatureUsageEvent"("userId", "featureId", "createdAt");

CREATE TABLE "PricingHistory" (
  "id" UUID NOT NULL, "planId" UUID, "promotionId" UUID, "actorId" UUID, "changeType" VARCHAR(80) NOT NULL,
  "before" JSONB, "after" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PricingHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PricingHistory_planId_createdAt_idx" ON "PricingHistory"("planId", "createdAt");
CREATE INDEX "PricingHistory_promotionId_createdAt_idx" ON "PricingHistory"("promotionId", "createdAt");

ALTER TABLE "BillingSubscription" ADD COLUMN "planConfigId" UUID;
ALTER TABLE "BillingPayment" ADD COLUMN "planConfigId" UUID, ADD COLUMN "promotionId" UUID;

ALTER TABLE "PlanFeatureLimit" ADD CONSTRAINT "PlanFeatureLimit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanFeatureLimit" ADD CONSTRAINT "PlanFeatureLimit_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "FeatureDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionPlan" ADD CONSTRAINT "PromotionPlan_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionPlan" ADD CONSTRAINT "PromotionPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BillingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeatureUsageBucket" ADD CONSTRAINT "FeatureUsageBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureUsageBucket" ADD CONSTRAINT "FeatureUsageBucket_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "FeatureDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureUsageEvent" ADD CONSTRAINT "FeatureUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureUsageEvent" ADD CONSTRAINT "FeatureUsageEvent_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "FeatureDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeatureUsageEvent" ADD CONSTRAINT "FeatureUsageEvent_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "FeatureUsageBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingHistory" ADD CONSTRAINT "PricingHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PricingHistory" ADD CONSTRAINT "PricingHistory_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_planConfigId_fkey" FOREIGN KEY ("planConfigId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_planConfigId_fkey" FOREIGN KEY ("planConfigId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "BillingPlan" ("id","code","legacyPlan","name","description","originalPrice","currency","billingInterval","intervalCount","displayOrder","updatedAt") VALUES
('10000000-0000-4000-8000-000000000001','FREE','FREE','Free','All core Vrompt features with practical usage limits.',0,'PHP','ONE_TIME',1,0,CURRENT_TIMESTAMP),
('10000000-0000-4000-8000-000000000002','PRO','PRO','Vrompt Pro','Significantly higher limits for regular AI work.',29900,'PHP','MONTH',1,10,CURRENT_TIMESTAMP);
INSERT INTO "FeatureDefinition" ("id","key","name","description","unitLabel","updatedAt") VALUES
('20000000-0000-4000-8000-000000000001','ai.generation','AI generation','Generate and refine prompts with AI.','generations',CURRENT_TIMESTAMP);
INSERT INTO "PlanFeatureLimit" ("id","planId","featureId","resetPeriod","limit","warningAt","updatedAt") VALUES
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','DAILY',10,80,CURRENT_TIMESTAMP),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','MONTHLY',200,80,CURRENT_TIMESTAMP),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','DAILY',100,80,CURRENT_TIMESTAMP),
('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','MONTHLY',2000,80,CURRENT_TIMESTAMP);
INSERT INTO "Promotion" ("id","name","description","discountType","discountValue","startsAt","endsAt","timezone","mode","updatedAt") VALUES
('40000000-0000-4000-8000-000000000001','Pro launch offer','Save 70% on Vrompt Pro for a limited time.','PERCENTAGE',70,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '30 days','Asia/Manila','AUTOMATIC',CURRENT_TIMESTAMP);
INSERT INTO "PromotionPlan" ("promotionId","planId") VALUES ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
UPDATE "BillingSubscription" SET "planConfigId" = CASE WHEN "plan"='PRO' THEN '10000000-0000-4000-8000-000000000002'::uuid ELSE '10000000-0000-4000-8000-000000000001'::uuid END;
UPDATE "BillingPayment" SET "planConfigId" = CASE WHEN "plan"='PRO' THEN '10000000-0000-4000-8000-000000000002'::uuid ELSE '10000000-0000-4000-8000-000000000001'::uuid END;
