CREATE TABLE "EconomicEntry" (
  "id" UUID PRIMARY KEY, "kind" VARCHAR(32) NOT NULL,
  "amount" DECIMAL(18,8) NOT NULL, "currency" CHAR(3) NOT NULL,
  "requestId" UUID, "note" VARCHAR(500) NOT NULL, "actorId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EconomicEntry_currency_createdAt_idx" ON "EconomicEntry"("currency", "createdAt");
CREATE FUNCTION vrompt_immutable_usage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Accounting entries are immutable; append a reconciliation entry'; END;
$$;
CREATE TRIGGER immutable_usage BEFORE UPDATE OR DELETE ON "UsageRecord" FOR EACH ROW EXECUTE FUNCTION vrompt_immutable_usage();
CREATE TRIGGER immutable_economics BEFORE UPDATE OR DELETE ON "EconomicEntry" FOR EACH ROW EXECUTE FUNCTION vrompt_immutable_usage();
ALTER TABLE "AIModel" ADD CONSTRAINT "AIModel_creditCost_positive" CHECK ("creditCost" > 0);
ALTER TABLE "BillingPlan" ADD CONSTRAINT "BillingPlan_workspace_limits" CHECK ("monthlyCredits" >= 0 AND "maxProjects" >= 0 AND "maxWorkflows" >= 0 AND "maxWorkflowSteps" BETWEEN 1 AND 20 AND "projectContextChars" BETWEEN 0 AND 32000);
