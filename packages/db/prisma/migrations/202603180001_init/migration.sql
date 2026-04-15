CREATE TYPE "WorkflowState" AS ENUM (
  'discovered',
  'scored',
  'queued',
  'outline_generated',
  'draft_generated',
  'in_review',
  'revision_requested',
  'approved',
  'published',
  'monitoring',
  'refresh_recommended',
  'refreshed'
);

CREATE TYPE "RecommendationType" AS ENUM (
  'write_now',
  'monitor',
  'refresh_existing',
  'support_cluster',
  'merge_or_decannibalize',
  'skip'
);

CREATE TYPE "ApprovalDecision" AS ENUM ('approve', 'request_revision', 'reject');
CREATE TYPE "PublicationStatus" AS ENUM ('draft', 'pending_publish', 'published', 'unpublished', 'sync_error');

CREATE TABLE "Keyword" (
  "id" TEXT PRIMARY KEY,
  "term" TEXT NOT NULL,
  "normalizedTerm" TEXT NOT NULL UNIQUE,
  "source" TEXT NOT NULL,
  "searchVolume" INTEGER NOT NULL DEFAULT 0,
  "keywordDifficulty" INTEGER NOT NULL DEFAULT 0,
  "trendVelocity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TopicCandidate" (
  "id" TEXT PRIMARY KEY,
  "keywordId" TEXT,
  "title" TEXT NOT NULL,
  "normalizedKeyword" TEXT NOT NULL UNIQUE,
  "source" TEXT NOT NULL,
  "workflowState" "WorkflowState" NOT NULL DEFAULT 'discovered',
  "recommendation" "RecommendationType" NOT NULL DEFAULT 'monitor',
  "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "scoreBreakdownJson" JSONB NOT NULL,
  "rationale" TEXT NOT NULL,
  "businessValueNotes" TEXT,
  "cannibalizationRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "topicType" TEXT NOT NULL DEFAULT 'new_article',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ContentBrief" (
  "id" TEXT PRIMARY KEY,
  "topicCandidateId" TEXT NOT NULL,
  "promptVersionId" TEXT,
  "primaryKeyword" TEXT NOT NULL,
  "secondaryKeywordsJson" JSONB NOT NULL,
  "briefJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Outline" (
  "id" TEXT PRIMARY KEY,
  "topicCandidateId" TEXT NOT NULL,
  "outlineJson" JSONB NOT NULL,
  "promptVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Draft" (
  "id" TEXT PRIMARY KEY,
  "topicCandidateId" TEXT NOT NULL,
  "briefId" TEXT,
  "promptVersionId" TEXT,
  "draftJson" JSONB NOT NULL,
  "html" TEXT NOT NULL,
  "markdown" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Approval" (
  "id" TEXT PRIMARY KEY,
  "topicCandidateId" TEXT NOT NULL,
  "draftId" TEXT,
  "reviewerEmail" TEXT NOT NULL,
  "decision" "ApprovalDecision" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Publication" (
  "id" TEXT PRIMARY KEY,
  "topicCandidateId" TEXT NOT NULL,
  "draftId" TEXT,
  "strapiEntryId" TEXT,
  "strapiDocumentId" TEXT,
  "slug" TEXT NOT NULL,
  "canonicalUrl" TEXT,
  "status" "PublicationStatus" NOT NULL DEFAULT 'draft',
  "metadataJson" JSONB NOT NULL,
  "fieldMappingJson" JSONB,
  "publishedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MetricSnapshot" (
  "id" TEXT PRIMARY KEY,
  "publicationId" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "averagePosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "metricsJson" JSONB NOT NULL
);

CREATE TABLE "OptimizationRecommendation" (
  "id" TEXT PRIMARY KEY,
  "topicCandidateId" TEXT,
  "publicationId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "recommendationJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ContentCluster" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "pillarKeyword" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ContentClusterMember" (
  "id" TEXT PRIMARY KEY,
  "clusterId" TEXT NOT NULL,
  "topicCandidateId" TEXT NOT NULL,
  "role" TEXT NOT NULL
);

CREATE TABLE "InternalLinkRecommendation" (
  "id" TEXT PRIMARY KEY,
  "sourceTopicId" TEXT NOT NULL,
  "targetTopicId" TEXT,
  "sourceUrl" TEXT,
  "targetUrl" TEXT,
  "anchorText" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "JobRun" (
  "id" TEXT PRIMARY KEY,
  "jobType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3)
);

CREATE TABLE "PromptVersion" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "systemText" TEXT NOT NULL,
  "userText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "TopicCandidate" ADD CONSTRAINT "TopicCandidate_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_topicCandidateId_fkey" FOREIGN KEY ("topicCandidateId") REFERENCES "TopicCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Outline" ADD CONSTRAINT "Outline_topicCandidateId_fkey" FOREIGN KEY ("topicCandidateId") REFERENCES "TopicCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_topicCandidateId_fkey" FOREIGN KEY ("topicCandidateId") REFERENCES "TopicCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ContentBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_topicCandidateId_fkey" FOREIGN KEY ("topicCandidateId") REFERENCES "TopicCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_topicCandidateId_fkey" FOREIGN KEY ("topicCandidateId") REFERENCES "TopicCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OptimizationRecommendation" ADD CONSTRAINT "OptimizationRecommendation_topicCandidateId_fkey" FOREIGN KEY ("topicCandidateId") REFERENCES "TopicCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OptimizationRecommendation" ADD CONSTRAINT "OptimizationRecommendation_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentClusterMember" ADD CONSTRAINT "ContentClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "ContentCluster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentClusterMember" ADD CONSTRAINT "ContentClusterMember_topicCandidateId_fkey" FOREIGN KEY ("topicCandidateId") REFERENCES "TopicCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
