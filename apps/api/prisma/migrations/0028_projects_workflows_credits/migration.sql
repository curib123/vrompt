-- AlterTable
ALTER TABLE "BillingPlan" ADD COLUMN     "maxProjects" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxWorkflowSteps" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "maxWorkflows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyCredits" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "projectContextChars" INTEGER NOT NULL DEFAULT 8000;

-- AlterTable
ALTER TABLE "AIModel" ADD COLUMN     "creditCost" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "SavedPrompt" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "QuotaReservation" ADD COLUMN     "creditUnits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL DEFAULT '',
    "preferredModelId" UUID,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "steps" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger" JSONB NOT NULL DEFAULT '{"type":"manual"}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "steps" JSONB NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'RESERVED',
    "completedSteps" INTEGER NOT NULL DEFAULT 0,
    "error" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_archived_updatedAt_idx" ON "Project"("userId", "archived", "updatedAt");

-- CreateIndex
CREATE INDEX "Workflow_projectId_updatedAt_idx" ON "Workflow"("projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_status_idx" ON "WorkflowRun"("workflowId", "status");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPrompt" ADD CONSTRAINT "SavedPrompt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

