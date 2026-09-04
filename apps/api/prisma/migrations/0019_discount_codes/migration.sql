CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

CREATE TABLE "DiscountCode" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "maxDiscountAmount" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxRedemptions" INTEGER,
    "maxRedemptionsPerUser" INTEGER NOT NULL DEFAULT 1,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BillingPayment"
    ADD COLUMN "originalAmount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "discountCodeId" UUID;

CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX "DiscountCode_isActive_startsAt_endsAt_idx" ON "DiscountCode"("isActive", "startsAt", "endsAt");
CREATE INDEX "BillingPayment_discountCodeId_status_createdAt_idx" ON "BillingPayment"("discountCodeId", "status", "createdAt");
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
