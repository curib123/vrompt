ALTER TABLE "RefreshToken" ADD COLUMN "familyId" UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX "RefreshToken_familyId_revokedAt_idx" ON "RefreshToken"("familyId", "revokedAt");
-- Require reauthentication when deploying the new session-bound token format.
UPDATE "RefreshToken" SET "revokedAt" = CURRENT_TIMESTAMP WHERE "revokedAt" IS NULL;
