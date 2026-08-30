CREATE TYPE "ActivityType" AS ENUM ('REPOSITORY_CREATED', 'VERSION_PUBLISHED', 'VARIANT_CREATED', 'COLLECTION_CREATED');

CREATE TABLE "ActivityEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "promptRepositoryId" UUID,
    "collectionId" UUID,
    "type" "ActivityType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityEvent_actorId_createdAt_idx" ON "ActivityEvent"("actorId", "createdAt");
CREATE INDEX "ActivityEvent_promptRepositoryId_createdAt_idx" ON "ActivityEvent"("promptRepositoryId", "createdAt");
CREATE INDEX "ActivityEvent_collectionId_createdAt_idx" ON "ActivityEvent"("collectionId", "createdAt");

ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_promptRepositoryId_fkey" FOREIGN KEY ("promptRepositoryId") REFERENCES "PromptRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
