ALTER TYPE "MembershipPlan" RENAME VALUE 'PREMIUM' TO 'PRO';

CREATE TYPE "BillingProvider" AS ENUM ('PAYMONGO');
CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'REQUIRES_ACTION');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELLED', 'EXPIRED', 'REFUNDED');
CREATE TYPE "BillingWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

ALTER TYPE "AuditTargetType" ADD VALUE 'BILLING_PAYMENT';
ALTER TYPE "AuditTargetType" ADD VALUE 'BILLING_SUBSCRIPTION';
ALTER TYPE "AuditTargetType" ADD VALUE 'BILLING_WEBHOOK';
ALTER TYPE "AuditActionType" ADD VALUE 'BILLING_CHECKOUT_CREATED';
ALTER TYPE "AuditActionType" ADD VALUE 'BILLING_PAYMENT_CONFIRMED';
ALTER TYPE "AuditActionType" ADD VALUE 'BILLING_PAYMENT_FAILED';
ALTER TYPE "AuditActionType" ADD VALUE 'BILLING_PRO_ACTIVATED';
ALTER TYPE "AuditActionType" ADD VALUE 'BILLING_PRO_EXPIRED';
ALTER TYPE "AuditActionType" ADD VALUE 'BILLING_PAYMENT_REFUNDED';
ALTER TYPE "AuditActionType" ADD VALUE 'BILLING_WEBHOOK_REJECTED';
ALTER TYPE "AuditActionType" ADD VALUE 'BILLING_WEBHOOK_DUPLICATE';
ALTER TYPE "AuditActionType" ADD VALUE 'BILLING_PLAN_CHANGED';

CREATE TABLE "BillingSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "plan" "MembershipPlan" NOT NULL DEFAULT 'PRO',
    "provider" "BillingProvider" NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "externalSubscriptionId" VARCHAR(255),
    "externalCustomerId" VARCHAR(255),
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPayment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subscriptionId" UUID,
    "provider" "BillingProvider" NOT NULL,
    "plan" "MembershipPlan" NOT NULL,
    "status" "BillingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "externalCheckoutSessionId" VARCHAR(255),
    "externalPaymentIntentId" VARCHAR(255),
    "externalPaymentId" VARCHAR(255),
    "failureCode" VARCHAR(100),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingWebhookEvent" (
    "id" UUID NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalEventId" VARCHAR(255) NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "status" "BillingWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "payloadHash" VARCHAR(64) NOT NULL,
    "errorCode" VARCHAR(100),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingSubscription_externalSubscriptionId_key" ON "BillingSubscription"("externalSubscriptionId");
CREATE UNIQUE INDEX "BillingPayment_idempotencyKey_key" ON "BillingPayment"("idempotencyKey");
CREATE UNIQUE INDEX "BillingPayment_externalCheckoutSessionId_key" ON "BillingPayment"("externalCheckoutSessionId");
CREATE UNIQUE INDEX "BillingWebhookEvent_externalEventId_key" ON "BillingWebhookEvent"("externalEventId");
CREATE INDEX "BillingSubscription_userId_status_currentPeriodEnd_idx" ON "BillingSubscription"("userId", "status", "currentPeriodEnd");
CREATE INDEX "BillingSubscription_provider_status_currentPeriodEnd_idx" ON "BillingSubscription"("provider", "status", "currentPeriodEnd");
CREATE INDEX "BillingPayment_userId_status_createdAt_idx" ON "BillingPayment"("userId", "status", "createdAt");
CREATE INDEX "BillingPayment_subscriptionId_status_idx" ON "BillingPayment"("subscriptionId", "status");
CREATE INDEX "BillingPayment_provider_status_createdAt_idx" ON "BillingPayment"("provider", "status", "createdAt");
CREATE INDEX "BillingWebhookEvent_provider_eventType_receivedAt_idx" ON "BillingWebhookEvent"("provider", "eventType", "receivedAt");
CREATE INDEX "BillingWebhookEvent_status_receivedAt_idx" ON "BillingWebhookEvent"("status", "receivedAt");

ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "BillingSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
