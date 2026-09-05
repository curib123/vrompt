BEGIN;
-- Existing populated databases require a verified backup before retirement.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "PromptRepository") AND
     current_setting('vrompt.legacy_backup_verified', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Back up database and evidence files, verify restore, then set vrompt.legacy_backup_verified=true for this migration session';
  END IF;
END $$;
INSERT INTO "SavedPrompt" (id, "userId", title, content, "createdAt", "updatedAt")
SELECT r.id, r."ownerId", r.title, v.content, r."createdAt", CURRENT_TIMESTAMP
FROM "PromptRepository" r JOIN "PromptVersion" v ON v.id = r."currentVersionId"
ON CONFLICT (id) DO NOTHING;

-- DropForeignKey
ALTER TABLE "PromptRepository" DROP CONSTRAINT "PromptRepository_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "PromptRepository" DROP CONSTRAINT "PromptRepository_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "PromptRepository" DROP CONSTRAINT "PromptRepository_currentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "PromptRepository" DROP CONSTRAINT "PromptRepository_sourcePromptId_fkey";

-- DropForeignKey
ALTER TABLE "PromptRepository" DROP CONSTRAINT "PromptRepository_rootPromptId_fkey";

-- DropForeignKey
ALTER TABLE "PromptAudience" DROP CONSTRAINT "PromptAudience_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "PromptAudience" DROP CONSTRAINT "PromptAudience_audienceId_fkey";

-- DropForeignKey
ALTER TABLE "UserAudience" DROP CONSTRAINT "UserAudience_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserAudience" DROP CONSTRAINT "UserAudience_audienceId_fkey";

-- DropForeignKey
ALTER TABLE "PromptVersion" DROP CONSTRAINT "PromptVersion_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "PromptVersion" DROP CONSTRAINT "PromptVersion_authorId_fkey";

-- DropForeignKey
ALTER TABLE "PromptVariable" DROP CONSTRAINT "PromptVariable_promptVersionId_fkey";

-- DropForeignKey
ALTER TABLE "PromptExample" DROP CONSTRAINT "PromptExample_promptVersionId_fkey";

-- DropForeignKey
ALTER TABLE "PromptEvidenceImage" DROP CONSTRAINT "PromptEvidenceImage_promptVersionId_fkey";

-- DropForeignKey
ALTER TABLE "PromptCopyEvent" DROP CONSTRAINT "PromptCopyEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "PromptCopyEvent" DROP CONSTRAINT "PromptCopyEvent_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "PromptCopyEvent" DROP CONSTRAINT "PromptCopyEvent_promptVersionId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityEvent" DROP CONSTRAINT "ActivityEvent_actorId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityEvent" DROP CONSTRAINT "ActivityEvent_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityEvent" DROP CONSTRAINT "ActivityEvent_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "AnalyticsEvent" DROP CONSTRAINT "AnalyticsEvent_actorId_fkey";

-- DropForeignKey
ALTER TABLE "AiGeneration" DROP CONSTRAINT "AiGeneration_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "AiGeneration" DROP CONSTRAINT "AiGeneration_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "AiUsageEvent" DROP CONSTRAINT "AiUsageEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "AiUsageEvent" DROP CONSTRAINT "AiUsageEvent_generationId_fkey";

-- DropForeignKey
ALTER TABLE "PromptTag" DROP CONSTRAINT "PromptTag_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "PromptTag" DROP CONSTRAINT "PromptTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_userId_fkey";

-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_userId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followerId_fkey";

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followingId_fkey";

-- DropForeignKey
ALTER TABLE "Collection" DROP CONSTRAINT "Collection_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "CollectionPrompt" DROP CONSTRAINT "CollectionPrompt_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "CollectionPrompt" DROP CONSTRAINT "CollectionPrompt_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_actorId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_commentId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_promptRepositoryId_fkey";

-- DropForeignKey
ALTER TABLE "ModerationAction" DROP CONSTRAINT "ModerationAction_actorId_fkey";

-- DropTable
DROP TABLE "PromptRepository";

-- DropTable
DROP TABLE "Audience";

-- DropTable
DROP TABLE "PromptAudience";

-- DropTable
DROP TABLE "UserAudience";

-- DropTable
DROP TABLE "PromptVersion";

-- DropTable
DROP TABLE "PromptVariable";

-- DropTable
DROP TABLE "PromptExample";

-- DropTable
DROP TABLE "PromptEvidenceImage";

-- DropTable
DROP TABLE "PromptCopyEvent";

-- DropTable
DROP TABLE "ActivityEvent";

-- DropTable
DROP TABLE "AnalyticsEvent";

-- DropTable
DROP TABLE "AiGeneration";

-- DropTable
DROP TABLE "AiUsageEvent";

-- DropTable
DROP TABLE "AiQuotaBucket";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Tag";

-- DropTable
DROP TABLE "PromptTag";

-- DropTable
DROP TABLE "Bookmark";

-- DropTable
DROP TABLE "Like";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "Follow";

-- DropTable
DROP TABLE "Collection";

-- DropTable
DROP TABLE "CollectionPrompt";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Report";

-- DropTable
DROP TABLE "ModerationAction";
COMMIT;
