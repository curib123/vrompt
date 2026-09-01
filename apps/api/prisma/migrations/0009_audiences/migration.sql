ALTER TYPE "AuditTargetType" ADD VALUE 'AUDIENCE';
ALTER TYPE "AuditActionType" ADD VALUE 'AUDIENCE_CREATED';
ALTER TYPE "AuditActionType" ADD VALUE 'AUDIENCE_UPDATED';
ALTER TYPE "AuditActionType" ADD VALUE 'AUDIENCE_ACTIVATED';
ALTER TYPE "AuditActionType" ADD VALUE 'AUDIENCE_DEACTIVATED';
ALTER TYPE "AuditActionType" ADD VALUE 'AUDIENCE_REORDERED';

ALTER TABLE "User"
ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "Audience" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromptAudience" (
    "promptRepositoryId" UUID NOT NULL,
    "audienceId" UUID NOT NULL,

    CONSTRAINT "PromptAudience_pkey" PRIMARY KEY ("promptRepositoryId", "audienceId")
);

CREATE TABLE "UserAudience" (
    "userId" UUID NOT NULL,
    "audienceId" UUID NOT NULL,

    CONSTRAINT "UserAudience_pkey" PRIMARY KEY ("userId", "audienceId")
);

CREATE UNIQUE INDEX "Audience_name_key" ON "Audience"("name");
CREATE UNIQUE INDEX "Audience_slug_key" ON "Audience"("slug");
CREATE INDEX "Audience_isActive_sortOrder_idx" ON "Audience"("isActive", "sortOrder");
CREATE INDEX "PromptAudience_audienceId_promptRepositoryId_idx" ON "PromptAudience"("audienceId", "promptRepositoryId");
CREATE INDEX "UserAudience_audienceId_userId_idx" ON "UserAudience"("audienceId", "userId");

ALTER TABLE "PromptAudience"
ADD CONSTRAINT "PromptAudience_promptRepositoryId_fkey"
FOREIGN KEY ("promptRepositoryId") REFERENCES "PromptRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PromptAudience"
ADD CONSTRAINT "PromptAudience_audienceId_fkey"
FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserAudience"
ADD CONSTRAINT "UserAudience_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAudience"
ADD CONSTRAINT "UserAudience_audienceId_fkey"
FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
