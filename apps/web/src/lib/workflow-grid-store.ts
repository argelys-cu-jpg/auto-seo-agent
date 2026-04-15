import {
  ArticleDraftingAgent,
  ContentBriefOutlineAgent,
  EditorialQaAgent,
  InMemoryAuditRepository,
  KeywordDiscoveryAgent,
  TopicPrioritizationAgent,
  WorkflowOrchestrator,
  withRetry,
} from "@cookunity-seo-agent/core";
import type { AuditRepository } from "@cookunity-seo-agent/core";
import type { WorkflowGridCell, WorkflowGridRow } from "./data";
type ApprovalDecision = "approve" | "request_revision" | "reject";
type WorkflowState =
  | "discovered"
  | "scored"
  | "queued"
  | "outline_generated"
  | "draft_generated"
  | "in_review"
  | "revision_requested"
  | "approved"
  | "published"
  | "monitoring"
  | "refresh_recommended"
  | "refreshed";

function toJsonInput(value: unknown) {
  return value as never;
}

async function getPrismaClient() {
  const dbModule = await import("@cookunity-seo-agent/db");
  const prisma = dbModule.prisma;

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.$connect();
      return prisma;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError;
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

class PrismaAuditRepository implements AuditRepository {
  async record(event: Parameters<AuditRepository["record"]>[0]): Promise<void> {
    const prisma = await getPrismaClient();
    await prisma.auditLog.create({
      data: {
        entityType: event.entityType,
        entityId: event.entityId,
        action: `${event.agent}:${event.toState}`,
        actorType: event.approvedByHuman ? "reviewer" : "system",
        payload: toJsonInput(event),
      },
    });
  }
}

async function createJobRun(jobType: string, idempotencyKey: string, payload: Record<string, unknown>) {
  const prisma = await getPrismaClient();
  return prisma.jobRun.create({
    data: {
      jobType,
      status: "running",
      idempotencyKey,
      payload: toJsonInput(payload),
    },
  });
}

async function completeJobRun(id: string, result: Record<string, unknown>) {
  const prisma = await getPrismaClient();
  await prisma.jobRun.update({
    where: { id },
    data: {
      status: "completed",
      result: toJsonInput(result),
      finishedAt: new Date(),
    },
  });
}

async function failJobRun(id: string, error: string) {
  const prisma = await getPrismaClient();
  await prisma.jobRun.update({
    where: { id },
    data: {
      status: "failed",
      error,
      finishedAt: new Date(),
    },
  });
}

async function getExistingInventory() {
  const prisma = await getPrismaClient();
  const publications = await prisma.publication.findMany({
    where: { status: "published" },
    include: { topicCandidate: true },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  return publications.map((publication) => ({
    id: publication.id,
    title: publication.topicCandidate.title,
    primaryKeyword: publication.topicCandidate.title,
    secondaryKeywords: [],
  }));
}

async function upsertManualTopic(primaryKeyword: string) {
  const prisma = await getPrismaClient();
  const normalizedKeyword = normalizeKeyword(primaryKeyword);
  const keyword = await prisma.keyword.upsert({
    where: { normalizedTerm: normalizedKeyword },
    update: {
      term: primaryKeyword.trim(),
      source: "manual",
    },
    create: {
      term: primaryKeyword.trim(),
      normalizedTerm: normalizedKeyword,
      source: "manual",
    },
  });

  const topic = await prisma.topicCandidate.upsert({
    where: { normalizedKeyword },
    update: {
      title: primaryKeyword.trim(),
      source: "manual",
      keywordId: keyword.id,
      workflowState: "discovered",
    },
    create: {
      title: primaryKeyword.trim(),
      normalizedKeyword,
      source: "manual",
      keywordId: keyword.id,
      workflowState: "discovered",
      recommendation: "monitor",
      totalScore: 0,
      scoreBreakdownJson: {},
      rationale: "Manual keyword added from workflow grid.",
      topicType: "new_article",
    },
  });

  return topic;
}

export async function createKeywordAndRunWorkflow(primaryKeyword: string) {
  const topic = await upsertManualTopic(primaryKeyword);
  return runWorkflowForTopic(topic.id);
}

export async function runWorkflowForTopic(topicCandidateId: string) {
  const prisma = await getPrismaClient();
  const topic = await prisma.topicCandidate.findUnique({
    where: { id: topicCandidateId },
    include: {
      keyword: true,
      briefs: { orderBy: { createdAt: "desc" }, take: 1 },
      drafts: { orderBy: { createdAt: "desc" }, take: 1 },
      publications: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });

  if (!topic) {
    throw new Error(`Topic candidate not found: ${topicCandidateId}`);
  }

  const runId = `workflow_${topic.id}_${Date.now()}`;
  const auditRepository = new PrismaAuditRepository();
  const orchestrator = new WorkflowOrchestrator(auditRepository);
  const jobRun = await createJobRun("workflow_grid_pipeline", runId, {
    topicCandidateId: topic.id,
    keyword: topic.title,
  });

  const keywordDiscoveryAgent = new KeywordDiscoveryAgent();
  const topicPrioritizationAgent = new TopicPrioritizationAgent();
  const contentBriefOutlineAgent = new ContentBriefOutlineAgent();
  const articleDraftingAgent = new ArticleDraftingAgent();
  const editorialQaAgent = new EditorialQaAgent();

  try {
    const existingInventory = await getExistingInventory();

    const discoveryEnvelope = await withRetry(
      (attempt) =>
        keywordDiscoveryAgent.execute(
          {
            seedTerms: [topic.title],
            existingInventory,
          },
          { runId, entityId: topic.id, attempt },
        ),
      3,
    );

    const matchedDiscovery =
      discoveryEnvelope.output.candidates.find(
        (candidate) => normalizeKeyword(candidate.keyword) === topic.normalizedKeyword,
      ) ?? discoveryEnvelope.output.candidates[0];

    if (topic.keywordId && matchedDiscovery) {
      await prisma.keyword.update({
        where: { id: topic.keywordId },
        data: {
          searchVolume: matchedDiscovery.searchVolume,
          keywordDifficulty: matchedDiscovery.keywordDifficulty,
          trendVelocity: matchedDiscovery.trendVelocity,
          source: matchedDiscovery.source,
        },
      });
    }

    await prisma.topicCandidate.update({
      where: { id: topic.id },
      data: {
        workflowState: "discovered",
      },
    });

    await orchestrator.recordTransition({
      runId,
      entityId: topic.id,
      entityType: "topic_candidate",
      agent: discoveryEnvelope.agent,
      toState: "discovered",
      details: {
        matchedKeyword: matchedDiscovery?.keyword,
        candidateCount: discoveryEnvelope.output.candidates.length,
      },
    });

    const prioritizationEnvelope = await withRetry(
      (attempt) =>
        topicPrioritizationAgent.execute(
          {
            candidates: discoveryEnvelope.output.candidates,
            existingInventory,
          },
          { runId, entityId: topic.id, attempt },
        ),
      3,
    );

    const prioritized =
      prioritizationEnvelope.output.rankedTopics.find(
        (candidate) => normalizeKeyword(candidate.keyword) === topic.normalizedKeyword,
      ) ?? orchestrator.selectPrimaryTopic(prioritizationEnvelope.output.rankedTopics);

    await prisma.topicCandidate.update({
      where: { id: topic.id },
      data: {
        title: prioritized.keyword,
        workflowState: "queued",
        recommendation: prioritized.recommendation,
        totalScore: prioritized.totalScore,
        scoreBreakdownJson: toJsonInput(prioritized.breakdown),
        rationale: prioritized.explanation,
        cannibalizationRisk: prioritized.cannibalizationRisk,
        topicType: prioritized.topicType,
      },
    });

    await orchestrator.recordTransition({
      runId,
      entityId: topic.id,
      entityType: "topic_candidate",
      agent: prioritizationEnvelope.agent,
      fromState: "discovered",
      toState: "scored",
      details: {
        totalScore: prioritized.totalScore,
        recommendation: prioritized.recommendation,
      },
    });

    await orchestrator.recordTransition({
      runId,
      entityId: topic.id,
      entityType: "topic_candidate",
      agent: "topic_prioritization",
      toState: "queued",
      details: { topicType: prioritized.topicType },
    });

    const briefEnvelope = await withRetry(
      (attempt) =>
        contentBriefOutlineAgent.execute(
          { topic: prioritized },
          { runId, entityId: topic.id, attempt },
        ),
      3,
    );

    const brief = await prisma.contentBrief.create({
      data: {
        topicCandidateId: topic.id,
        promptVersionId: briefEnvelope.promptVersionId ?? null,
        primaryKeyword: briefEnvelope.output.brief.primaryKeyword,
        secondaryKeywordsJson: toJsonInput(briefEnvelope.output.brief.secondaryKeywords),
        briefJson: toJsonInput(briefEnvelope.output.brief),
      },
    });

    await prisma.outline.create({
      data: {
        topicCandidateId: topic.id,
        promptVersionId: briefEnvelope.promptVersionId ?? null,
        outlineJson: {
          titleOptions: briefEnvelope.output.brief.titleOptions,
          faqCandidates: briefEnvelope.output.brief.faqCandidates,
          recommendedInternalLinks: briefEnvelope.output.brief.recommendedInternalLinks,
        },
      },
    });

    await prisma.topicCandidate.update({
      where: { id: topic.id },
      data: { workflowState: "outline_generated" },
    });

    await orchestrator.recordTransition({
      runId,
      entityId: topic.id,
      entityType: "topic_candidate",
      agent: briefEnvelope.agent,
      fromState: "queued",
      toState: "outline_generated",
      details: { briefId: brief.id },
    });

    const draftEnvelope = await withRetry(
      (attempt) =>
        articleDraftingAgent.execute(
          { brief: briefEnvelope.output.brief },
          { runId, entityId: topic.id, attempt },
        ),
      3,
    );

    const draft = await prisma.draft.create({
      data: {
        topicCandidateId: topic.id,
        briefId: brief.id,
        promptVersionId: draftEnvelope.promptVersionId ?? null,
        draftJson: toJsonInput(draftEnvelope.output.draft),
        html: draftEnvelope.output.draft.html,
        markdown: JSON.stringify(draftEnvelope.output.draft.sections),
      },
    });

    await prisma.topicCandidate.update({
      where: { id: topic.id },
      data: { workflowState: "draft_generated" },
    });

    await orchestrator.recordTransition({
      runId,
      entityId: topic.id,
      entityType: "draft",
      agent: draftEnvelope.agent,
      fromState: "outline_generated",
      toState: "draft_generated",
      details: { draftId: draft.id },
    });

    const qaEnvelope = await withRetry(
      (attempt) =>
        editorialQaAgent.execute(
          {
            brief: briefEnvelope.output.brief,
            draft: draftEnvelope.output.draft,
          },
          { runId, entityId: topic.id, attempt },
        ),
      2,
    );

    await prisma.topicCandidate.update({
      where: { id: topic.id },
      data: { workflowState: "in_review" },
    });

    await orchestrator.recordTransition({
      runId,
      entityId: topic.id,
      entityType: "draft",
      agent: qaEnvelope.agent,
      fromState: "draft_generated",
      toState: "in_review",
      details: {
        passed: qaEnvelope.output.passed,
        flags: qaEnvelope.output.flags,
      },
    });

    await completeJobRun(jobRun.id, {
      topicCandidateId: topic.id,
      briefId: brief.id,
      draftId: draft.id,
      qaPassed: qaEnvelope.output.passed,
    });

    return {
      topicCandidateId: topic.id,
      briefId: brief.id,
      draftId: draft.id,
      qaPassed: qaEnvelope.output.passed,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown workflow error";
    await failJobRun(jobRun.id, message);
    throw error;
  }
}

export async function listPersistedWorkflowGridRows(): Promise<WorkflowGridRow[]> {
  const prisma = await getPrismaClient();
  const topics = await prisma.topicCandidate.findMany({
    include: {
      keyword: true,
      briefs: { orderBy: { createdAt: "desc" }, take: 1 },
      drafts: { orderBy: { createdAt: "desc" }, take: 1, include: { approvals: { orderBy: { createdAt: "desc" }, take: 1 } } },
      publications: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
          optimizationTasks: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return topics.map((topic) => {
    const latestBrief = topic.briefs[0];
    const latestDraft = topic.drafts[0];
    const latestApproval = latestDraft?.approvals[0];
    const latestPublication = topic.publications[0];

    const cells: WorkflowGridCell[] = [
      {
        step: "keyword_discovery",
        status: topic.workflowState === "discovered" || topic.totalScore > 0 || !!latestBrief ? "success" : "pending",
        label: topic.keyword ? "Keyword stored" : "Awaiting keyword record",
        detail: topic.keyword
          ? `Source: ${topic.keyword.source}. Volume: ${topic.keyword.searchVolume || "TBD"}.`
          : "Primary keyword has not been enriched yet.",
      },
      {
        step: "topic_prioritization",
        status: topic.totalScore > 0 ? "success" : "pending",
        label: topic.totalScore > 0 ? `Score ${topic.totalScore}` : "Not scored",
        detail: topic.rationale || "Topic scoring has not run yet.",
      },
      {
        step: "content_brief_outline",
        status: latestBrief ? "success" : "pending",
        label: latestBrief ? "Brief saved" : "No brief yet",
        detail: latestBrief
          ? `Primary keyword: ${latestBrief.primaryKeyword}`
          : "Outline step has not produced persisted output yet.",
      },
      {
        step: "article_drafting",
        status: latestDraft ? "success" : "pending",
        label: latestDraft ? "Draft saved" : "No draft yet",
        detail: latestDraft
          ? `Updated ${latestDraft.updatedAt.toISOString()}`
          : "Drafting step has not produced persisted output yet.",
      },
      {
        step: "editorial_qa",
        status:
          topic.workflowState === "approved"
            ? "success"
            : latestApproval?.decision === "request_revision"
              ? "review_needed"
              : latestDraft
                ? "review_needed"
                : "pending",
        label:
          topic.workflowState === "approved"
            ? "Approved"
            : latestApproval?.decision === "request_revision"
              ? "Revision requested"
              : latestDraft
                ? "In review"
                : "Not ready",
        detail:
          latestApproval?.notes ??
          (latestDraft
            ? "Draft exists and is waiting for human review."
            : "Review begins after a draft is generated."),
      },
      {
        step: "publishing_strapi",
        status:
          latestPublication?.status === "published"
            ? "published"
            : latestPublication?.status === "draft"
              ? "waiting"
              : "waiting",
        label:
          latestPublication?.status === "published"
            ? "Published to Strapi"
            : latestPublication?.status === "draft"
              ? "Strapi draft"
              : "Blocked",
        detail:
          latestPublication?.strapiEntryId
            ? `Entry ${latestPublication.strapiEntryId}`
            : "Publish agent is blocked until approval is recorded.",
      },
      {
        step: "performance_monitoring_refresh",
        status:
          latestPublication?.metricSnapshots[0] || latestPublication?.optimizationTasks[0]
            ? "success"
            : latestPublication?.status === "published"
              ? "running"
              : "pending",
        label:
          latestPublication?.optimizationTasks[0]
            ? "Refresh tasks"
            : latestPublication?.metricSnapshots[0]
              ? "Monitoring live"
              : latestPublication?.status === "published"
                ? "Awaiting first snapshot"
                : "Not started",
        detail:
          latestPublication?.optimizationTasks[0]?.reason ??
          (latestPublication?.metricSnapshots[0]
            ? `CTR ${latestPublication.metricSnapshots[0].ctr}`
            : "Monitoring begins after publish."),
      },
    ];

    return {
      id: topic.id,
      pillar: "Custom",
      theme: "Custom",
      primaryKeyword: topic.title,
      searchVolume: topic.keyword?.searchVolume ? String(topic.keyword.searchVolume) : "",
      contentType: "Guide",
      cells,
    };
  });
}

export async function safeListWorkflowGridRows(): Promise<WorkflowGridRow[] | null> {
  try {
    return await listPersistedWorkflowGridRows();
  } catch {
    return null;
  }
}

export async function submitReviewForDraft(
  draftId: string,
  decision: ApprovalDecision,
  notes: string | null,
  reviewerEmail: string,
) {
  const prisma = await getPrismaClient();
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { topicCandidate: true },
  });

  if (!draft) {
    throw new Error(`Draft not found: ${draftId}`);
  }

  const approval = await prisma.approval.create({
    data: {
      topicCandidateId: draft.topicCandidateId,
      draftId: draft.id,
      reviewerEmail,
      decision,
      notes: notes ?? null,
    },
  });

  const nextState: WorkflowState =
    decision === "approve"
      ? "approved"
      : decision === "request_revision"
        ? "revision_requested"
        : "in_review";

  await prisma.topicCandidate.update({
    where: { id: draft.topicCandidateId },
    data: { workflowState: nextState },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "draft",
      entityId: draft.id,
      action: `review:${decision}`,
      actorType: "reviewer",
      actorId: reviewerEmail,
      payload: {
        decision,
        notes,
        topicCandidateId: draft.topicCandidateId,
      },
    },
  });

  return approval;
}

export async function publishApprovedDraft(topicCandidateId: string) {
  const prisma = await getPrismaClient();
  const topic = await prisma.topicCandidate.findUnique({
    where: { id: topicCandidateId },
    include: {
      drafts: { orderBy: { createdAt: "desc" }, take: 1 },
      approvals: { orderBy: { createdAt: "desc" }, take: 1 },
      publications: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });

  if (!topic) {
    throw new Error(`Topic candidate not found: ${topicCandidateId}`);
  }

  if (topic.workflowState !== "approved") {
    throw new Error("Topic is not approved for publishing.");
  }

  const draft = topic.drafts[0];
  if (!draft) {
    throw new Error("No draft available to publish.");
  }

  const publication = topic.publications[0];
  if (publication) {
    await prisma.publication.update({
      where: { id: publication.id },
      data: {
        status: "published",
        slug: publication.slug || slugify(topic.title),
        publishedAt: new Date(),
        ...(publication.metadataJson !== null
          ? { metadataJson: toJsonInput(publication.metadataJson) }
          : {}),
      },
    });
  } else {
    await prisma.publication.create({
      data: {
        topicCandidateId: topic.id,
        draftId: draft.id,
        slug: slugify(topic.title),
        status: "published",
        metadataJson: {
          title: topic.title,
        },
        publishedAt: new Date(),
      },
    });
  }

  await prisma.topicCandidate.update({
    where: { id: topic.id },
    data: { workflowState: "published" },
  });
}
