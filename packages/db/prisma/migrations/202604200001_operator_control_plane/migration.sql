CREATE TYPE "OpportunityPath" AS ENUM ('blog', 'landing_page');
CREATE TYPE "OpportunityType" AS ENUM ('keyword', 'page_idea', 'competitor_page', 'lp_optimization');
CREATE TYPE "RowStatus" AS ENUM ('idle', 'running', 'blocked', 'needs_review', 'approved', 'published', 'failed');
CREATE TYPE "WorkflowStepName" AS ENUM ('discovery', 'prioritization', 'brief', 'draft', 'qa', 'publish');
CREATE TYPE "WorkflowStepStatus" AS ENUM ('not_started', 'running', 'completed', 'failed', 'needs_review', 'approved');

CREATE TABLE "Opportunity" (
  "id" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "normalizedKeyword" TEXT NOT NULL,
  "pageIdea" TEXT,
  "competitorPageUrl" TEXT,
  "intent" TEXT NOT NULL,
  "path" "OpportunityPath" NOT NULL,
  "type" "OpportunityType" NOT NULL DEFAULT 'keyword',
  "rowStatus" "RowStatus" NOT NULL DEFAULT 'idle',
  "lastError" TEXT,
  "topicCandidateId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowRun" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "status" "RowStatus" NOT NULL DEFAULT 'idle',
  "trigger" TEXT NOT NULL,
  "currentStep" "WorkflowStepName",
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowStepRun" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "workflowRunId" TEXT NOT NULL,
  "stepName" "WorkflowStepName" NOT NULL,
  "status" "WorkflowStepStatus" NOT NULL DEFAULT 'not_started',
  "version" INTEGER NOT NULL DEFAULT 1,
  "inputJson" JSONB,
  "outputJson" JSONB,
  "manualOutputJson" JSONB,
  "artifactType" TEXT,
  "artifactId" TEXT,
  "error" TEXT,
  "revisionNote" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkflowStepRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RevisionNote" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "workflowStepRunId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevisionNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublishResult" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "workflowRunId" TEXT,
  "workflowStepRunId" TEXT,
  "publicationId" TEXT,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "metadataJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublishResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Opportunity_normalizedKeyword_key" ON "Opportunity"("normalizedKeyword");

ALTER TABLE "Opportunity"
  ADD CONSTRAINT "Opportunity_topicCandidateId_fkey"
  FOREIGN KEY ("topicCandidateId") REFERENCES "TopicCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkflowRun"
  ADD CONSTRAINT "WorkflowRun_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkflowStepRun"
  ADD CONSTRAINT "WorkflowStepRun_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkflowStepRun"
  ADD CONSTRAINT "WorkflowStepRun_workflowRunId_fkey"
  FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RevisionNote"
  ADD CONSTRAINT "RevisionNote_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RevisionNote"
  ADD CONSTRAINT "RevisionNote_workflowStepRunId_fkey"
  FOREIGN KEY ("workflowStepRunId") REFERENCES "WorkflowStepRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublishResult"
  ADD CONSTRAINT "PublishResult_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublishResult"
  ADD CONSTRAINT "PublishResult_workflowRunId_fkey"
  FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublishResult"
  ADD CONSTRAINT "PublishResult_workflowStepRunId_fkey"
  FOREIGN KEY ("workflowStepRunId") REFERENCES "WorkflowStepRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublishResult"
  ADD CONSTRAINT "PublishResult_publicationId_fkey"
  FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
