import { OpportunityWorkflowService } from "@cookunity-seo-agent/core/src/services/opportunity-workflow-service";
import type {
  OpportunityPath,
  OpportunityType,
  RowStatus,
  WorkflowStepName,
  WorkflowStepStatus,
} from "@cookunity-seo-agent/shared";

function toJsonValue(value: unknown) {
  return value as Record<string, unknown> | null;
}

async function getPrismaClient() {
  const dbModule = await import("@cookunity-seo-agent/db");
  const prisma = dbModule.prisma;
  await prisma.$connect();
  return prisma;
}

const service = new OpportunityWorkflowService();
const orderedSteps: WorkflowStepName[] = ["discovery", "prioritization", "brief", "draft", "qa", "publish"];

export interface GridStepView {
  id: string;
  stepName: WorkflowStepName;
  status: WorkflowStepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  revisionNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  version: number;
  output?: Record<string, unknown> | null;
  manualOutput?: Record<string, unknown> | null;
}

export interface GridOpportunityRow {
  id: string;
  keyword: string;
  intent: string;
  path: OpportunityPath;
  type: OpportunityType;
  rowStatus: RowStatus;
  searchVolume?: number;
  competitorPageUrl?: string;
  pageIdea?: string;
  steps: GridStepView[];
  updatedAt: string;
}

export interface GridOpportunityDetail extends GridOpportunityRow {
  auditLog: Array<{
    id: string;
    action: string;
    actorType: string;
    actorId?: string;
    createdAt: string;
  }>;
  revisionNotes: Array<{
    id: string;
    note: string;
    requestedBy: string;
    createdAt: string;
  }>;
  publishResults: Array<{
    id: string;
    status: string;
    message?: string;
    createdAt: string;
  }>;
}

function makeMockStep(stepName: WorkflowStepName, status: WorkflowStepStatus): GridStepView {
  return {
    id: `mock_${stepName}`,
    stepName,
    status,
    version: 1,
    ...(status === "completed" || status === "approved"
      ? { completedAt: new Date().toISOString() }
      : {}),
    output:
      stepName === "brief"
        ? {
            reviewLabel: "Blog → email capture → nurture → trial",
            summary: "Create a capture-first brief with keyword framing, email bridge CTA, and gated asset angle.",
          }
        : stepName === "draft"
          ? {
              h1: "Mediterranean meal delivery ideas for busy weeks",
              intro: "A richer draft appears here once the database and providers are connected.",
              html: "<article><h1>Mediterranean meal delivery ideas for busy weeks</h1><p>Mock draft preview.</p></article>",
            }
          : null,
  };
}

function mockRows(): GridOpportunityRow[] {
  return [
    {
      id: "mock_blog_row",
      keyword: "mediterranean meal delivery ideas",
      intent: "capture",
      path: "blog",
      type: "keyword",
      rowStatus: "needs_review",
      searchVolume: 1900,
      steps: [
        makeMockStep("discovery", "completed"),
        makeMockStep("prioritization", "completed"),
        makeMockStep("brief", "completed"),
        makeMockStep("draft", "completed"),
        makeMockStep("qa", "needs_review"),
        makeMockStep("publish", "not_started"),
      ],
      updatedAt: new Date().toISOString(),
    },
    {
      id: "mock_lp_row",
      keyword: "best vegetarian meal delivery",
      intent: "comparison",
      path: "landing_page",
      type: "lp_optimization",
      rowStatus: "blocked",
      competitorPageUrl: "https://www.purplecarrot.com/",
      steps: [
        makeMockStep("discovery", "completed"),
        makeMockStep("prioritization", "completed"),
        makeMockStep("brief", "needs_review"),
        makeMockStep("draft", "not_started"),
        makeMockStep("qa", "not_started"),
        makeMockStep("publish", "not_started"),
      ],
      updatedAt: new Date().toISOString(),
    },
  ];
}

function latestSteps(stepRuns: Array<{
  id: string;
  stepName: WorkflowStepName;
  status: WorkflowStepStatus;
  version: number;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  revisionNote: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  outputJson: unknown;
  manualOutputJson: unknown;
}>): GridStepView[] {
  return orderedSteps.map((stepName) => {
    const current = stepRuns
      .filter((step) => step.stepName === stepName)
      .sort((left, right) => right.version - left.version)[0];

    if (!current) {
      return {
        id: `missing_${stepName}`,
        stepName,
        status: "not_started",
        version: 0,
      };
    }

    return {
      id: current.id,
      stepName,
      status: current.status,
      version: current.version,
      ...(current.startedAt ? { startedAt: current.startedAt.toISOString() } : {}),
      ...(current.completedAt ? { completedAt: current.completedAt.toISOString() } : {}),
      ...(current.error ? { error: current.error } : {}),
      ...(current.revisionNote ? { revisionNote: current.revisionNote } : {}),
      ...(current.approvedBy ? { approvedBy: current.approvedBy } : {}),
      ...(current.approvedAt ? { approvedAt: current.approvedAt.toISOString() } : {}),
      output: toJsonValue(current.outputJson),
      manualOutput: toJsonValue(current.manualOutputJson),
    };
  });
}

function readSearchVolume(topicCandidate: unknown): number | undefined {
  if (!topicCandidate || typeof topicCandidate !== "object") return undefined;
  const keyword = (topicCandidate as { keyword?: unknown }).keyword;
  if (!keyword || typeof keyword !== "object") return undefined;
  const searchVolume = (keyword as { searchVolume?: unknown }).searchVolume;
  return typeof searchVolume === "number" ? searchVolume : undefined;
}

function mapOpportunity(opportunity: {
  id: string;
  keyword: string;
  intent: string;
  path: OpportunityPath;
  type: OpportunityType;
  rowStatus: RowStatus;
  competitorPageUrl: string | null;
  pageIdea: string | null;
  updatedAt: Date;
  topicCandidate: unknown;
  workflowRuns: Array<{
    stepRuns: Array<{
      id: string;
      stepName: WorkflowStepName;
      status: WorkflowStepStatus;
      version: number;
      startedAt: Date | null;
      completedAt: Date | null;
      error: string | null;
      revisionNote: string | null;
      approvedBy: string | null;
      approvedAt: Date | null;
      outputJson: unknown;
      manualOutputJson: unknown;
    }>;
  }>;
}): GridOpportunityRow {
  const stepRuns = opportunity.workflowRuns[0]?.stepRuns ?? [];
  const searchVolume = readSearchVolume(opportunity.topicCandidate);
  return {
    id: opportunity.id,
    keyword: opportunity.keyword,
    intent: opportunity.intent,
    path: opportunity.path,
    type: opportunity.type,
    rowStatus: opportunity.rowStatus,
    ...(searchVolume !== undefined ? { searchVolume } : {}),
    ...(opportunity.competitorPageUrl ? { competitorPageUrl: opportunity.competitorPageUrl } : {}),
    ...(opportunity.pageIdea ? { pageIdea: opportunity.pageIdea } : {}),
    steps: latestSteps(stepRuns),
    updatedAt: opportunity.updatedAt.toISOString(),
  };
}

function mapOpportunityDetail(opportunity: {
  id: string;
  keyword: string;
  intent: string;
  path: OpportunityPath;
  type: OpportunityType;
  rowStatus: RowStatus;
  competitorPageUrl: string | null;
  pageIdea: string | null;
  updatedAt: Date;
  topicCandidate: unknown;
  workflowRuns: Array<{
    stepRuns: Array<{
      id: string;
      stepName: WorkflowStepName;
      status: WorkflowStepStatus;
      version: number;
      startedAt: Date | null;
      completedAt: Date | null;
      error: string | null;
      revisionNote: string | null;
      approvedBy: string | null;
      approvedAt: Date | null;
      outputJson: unknown;
      manualOutputJson: unknown;
    }>;
  }>;
  revisionNotes: Array<{
    id: string;
    note: string;
    requestedBy: string;
    createdAt: Date;
  }>;
  publishResults: Array<{
    id: string;
    status: string;
    message: string | null;
    createdAt: Date;
  }>;
}): GridOpportunityDetail {
  return {
    ...mapOpportunity(opportunity),
    auditLog: [],
    revisionNotes: opportunity.revisionNotes.map((note) => ({
      id: note.id,
      note: note.note,
      requestedBy: note.requestedBy,
      createdAt: note.createdAt.toISOString(),
    })),
    publishResults: opportunity.publishResults.map((result) => ({
      id: result.id,
      status: result.status,
      ...(result.message ? { message: result.message } : {}),
      createdAt: result.createdAt.toISOString(),
    })),
  };
}

export async function listGridControlPlane(): Promise<GridOpportunityRow[]> {
  const prisma = await getPrismaClient();
  const opportunities = await prisma.opportunity.findMany({
    include: {
      topicCandidate: {
        include: {
          keyword: true,
        },
      },
      workflowRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          stepRuns: {
            orderBy: [{ stepName: "asc" }, { version: "desc" }],
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return opportunities.map(mapOpportunity);
}

export async function safeListGridControlPlane(): Promise<GridOpportunityRow[] | null> {
  try {
    return await listGridControlPlane();
  } catch {
    return null;
  }
}

export async function getGridOpportunityDetail(opportunityId: string): Promise<GridOpportunityDetail | null> {
  try {
    const prisma = await getPrismaClient();
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        topicCandidate: {
          include: { keyword: true },
        },
        workflowRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            stepRuns: {
              orderBy: [{ stepName: "asc" }, { version: "desc" }],
            },
          },
        },
        revisionNotes: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        publishResults: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!opportunity) {
      return null;
    }

    const audit = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "opportunity", entityId: opportunityId },
          { payload: { path: ["opportunityId"], equals: opportunityId } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return {
      ...mapOpportunityDetail(opportunity),
      auditLog: audit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorType: entry.actorType,
        ...(entry.actorId ? { actorId: entry.actorId } : {}),
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  } catch {
    return null;
  }
}

export async function createOpportunityRecordAndRunWorkflow(input: {
  keyword: string;
  path: OpportunityPath;
  type: OpportunityType;
  pageIdea?: string;
  competitorPageUrl?: string;
}) {
  const opportunity = await service.createOpportunity(input);
  await service.runWorkflow(opportunity.id, { forceFallback: true });
  const detail = await getGridOpportunityDetail(opportunity.id);
  if (!detail) {
    throw new Error("Created workflow could not be loaded.");
  }
  return detail;
}

export async function createOpportunityRecord(input: {
  keyword: string;
  path: OpportunityPath;
  type: OpportunityType;
  pageIdea?: string;
  competitorPageUrl?: string;
}) {
  return service.createOpportunity(input);
}

export async function createOpportunityAndRunWorkflow(input: {
  keyword: string;
  path: OpportunityPath;
  type: OpportunityType;
  pageIdea?: string;
  competitorPageUrl?: string;
}) {
  return createOpportunityRecordAndRunWorkflow(input);
}

export async function runWorkflowForOpportunity(opportunityId: string) {
  await service.runWorkflow(opportunityId, { forceFallback: true });
  const detail = await getGridOpportunityDetail(opportunityId);
  if (!detail) {
    throw new Error("Workflow detail could not be loaded.");
  }
  return detail;
}

export async function runWorkflowStepForOpportunity(opportunityId: string, stepName: WorkflowStepName) {
  await service.executeStep(opportunityId, stepName, {
    trigger: "manual_step_run",
    forceFallback: true,
  });
  const detail = await getGridOpportunityDetail(opportunityId);
  if (!detail) {
    throw new Error("Workflow detail could not be loaded after step execution.");
  }
  return detail;
}

export async function rerunWorkflowStep(stepRunId: string, requestedBy: string, note?: string) {
  const result = await service.rerunStep(stepRunId, requestedBy, note);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after rerun.");
  }
  return mapOpportunityDetail(result);
}

export async function approveWorkflowStep(stepRunId: string, approvedBy: string) {
  const result = await service.approveStep(stepRunId, approvedBy);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after approval.");
  }
  return mapOpportunityDetail(result);
}

export async function requestWorkflowStepRevision(stepRunId: string, requestedBy: string, note: string) {
  const result = await service.requestRevision(stepRunId, requestedBy, note);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after revision request.");
  }
  return mapOpportunityDetail(result);
}

export async function saveWorkflowStepEdit(stepRunId: string, editedBy: string, manualOutput: unknown) {
  const result = await service.saveManualEdit(stepRunId, editedBy, manualOutput);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after saving manual edit.");
  }
  return mapOpportunityDetail(result);
}

export async function publishOpportunityFromGrid(opportunityId: string, actor: string) {
  const result = await service.publishOpportunity(opportunityId, actor);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after publishing.");
  }
  return mapOpportunityDetail(result);
}

export async function getGridControlPlaneData() {
  const rows = await safeListGridControlPlane();
  if (!rows) {
    return {
      persistenceMode: "mock" as const,
      databaseReady: false,
      rows: mockRows(),
    };
  }

  return {
    persistenceMode: "database" as const,
    databaseReady: true,
    rows,
  };
}

export async function submitReviewForDraft(
  draftId: string,
  decision: "approve" | "request_revision" | "reject",
  notes: string | null,
  reviewerEmail: string,
) {
  const prisma = await getPrismaClient();
  const stepRun = await prisma.workflowStepRun.findFirst({
    where: {
      stepName: "qa",
      opportunity: {
        topicCandidate: {
          drafts: {
            some: {
              id: draftId,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!stepRun) {
    throw new Error(`QA step not found for draft: ${draftId}`);
  }

  if (decision === "approve") {
    return approveWorkflowStep(stepRun.id, reviewerEmail);
  }

  return requestWorkflowStepRevision(stepRun.id, reviewerEmail, notes ?? "Revision requested.");
}

export async function publishApprovedDraft(opportunityId: string) {
  return publishOpportunityFromGrid(opportunityId, process.env.ADMIN_EMAIL ?? "reviewer@cookunity.local");
}

export async function createKeywordAndRunWorkflow(input: string | {
  keyword: string;
  path: OpportunityPath;
  type: OpportunityType;
  pageIdea?: string;
  competitorPageUrl?: string;
}) {
  if (typeof input === "string") {
    return createOpportunityRecordAndRunWorkflow({
      keyword: input,
      path: "blog",
      type: "keyword",
    });
  }
  return createOpportunityRecordAndRunWorkflow(input);
}

export async function safeListWorkflowGridRows(): Promise<any[] | null> {
  try {
    const rows = await listGridControlPlane();
    return rows.map((row) => ({
      id: row.id,
      pillar: row.path === "blog" ? "Blog" : "Landing page",
      theme: row.intent,
      primaryKeyword: row.keyword,
      searchVolume: row.searchVolume ? String(row.searchVolume) : "",
      contentType: row.type.replaceAll("_", " "),
      cells: row.steps.map((step) => ({
        step:
          step.stepName === "discovery"
            ? "keyword_discovery"
            : step.stepName === "prioritization"
              ? "topic_prioritization"
              : step.stepName === "brief"
                ? "content_brief_outline"
                : step.stepName === "draft"
                  ? "article_drafting"
                  : step.stepName === "qa"
                    ? "editorial_qa"
                    : step.stepName === "publish"
                      ? "publishing_strapi"
                      : "performance_monitoring_refresh",
        status:
          step.status === "approved"
            ? "success"
            : step.status === "needs_review"
              ? "review_needed"
              : step.status === "not_started"
                ? "pending"
                : step.status === "failed"
                  ? "review_needed"
                  : step.status,
        label: step.stepName,
        detail: step.completedAt ? `Completed ${step.completedAt}` : "Awaiting output",
      })),
    }));
  } catch {
    return null;
  }
}
