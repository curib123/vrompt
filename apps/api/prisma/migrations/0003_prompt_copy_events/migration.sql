-- CreateTable
CREATE TABLE "PromptCopyEvent" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "promptRepositoryId" UUID NOT NULL,
    "promptVersionId" UUID NOT NULL,
    "dedupeKey" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptCopyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromptCopyEvent_dedupeKey_key" ON "PromptCopyEvent"("dedupeKey");
CREATE INDEX "PromptCopyEvent_promptRepositoryId_createdAt_idx" ON "PromptCopyEvent"("promptRepositoryId", "createdAt");
CREATE INDEX "PromptCopyEvent_promptVersionId_createdAt_idx" ON "PromptCopyEvent"("promptVersionId", "createdAt");
CREATE INDEX "PromptCopyEvent_userId_createdAt_idx" ON "PromptCopyEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PromptCopyEvent" ADD CONSTRAINT "PromptCopyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PromptCopyEvent" ADD CONSTRAINT "PromptCopyEvent_promptRepositoryId_fkey" FOREIGN KEY ("promptRepositoryId") REFERENCES "PromptRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptCopyEvent" ADD CONSTRAINT "PromptCopyEvent_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
