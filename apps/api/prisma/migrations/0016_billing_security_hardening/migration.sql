-- Prevent one PayMongo resource from being credited to more than one local payment.
CREATE UNIQUE INDEX "BillingPayment_externalPaymentIntentId_key"
  ON "BillingPayment"("externalPaymentIntentId");

CREATE UNIQUE INDEX "BillingPayment_externalPaymentId_key"
  ON "BillingPayment"("externalPaymentId");

-- A user may have historical subscriptions, but only one checkout or active
-- access period can be open at a time. This closes concurrent-checkout races.
CREATE UNIQUE INDEX "BillingSubscription_one_open_per_user_key"
  ON "BillingSubscription"("userId")
  WHERE "status" IN ('PENDING', 'ACTIVE');
