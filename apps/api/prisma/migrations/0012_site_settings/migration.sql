ALTER TYPE "AuditTargetType" ADD VALUE IF NOT EXISTS 'SETTING';
ALTER TYPE "AuditActionType" ADD VALUE IF NOT EXISTS 'SETTING_UPDATED';
ALTER TYPE "AuditActionType" ADD VALUE IF NOT EXISTS 'SETTING_RESET';

CREATE TABLE "SiteSetting" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "group" VARCHAR(40) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");
CREATE INDEX "SiteSetting_group_key_idx" ON "SiteSetting"("group", "key");
ALTER TABLE "SiteSetting" ADD CONSTRAINT "SiteSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
