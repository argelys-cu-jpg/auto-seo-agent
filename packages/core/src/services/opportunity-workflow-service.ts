import { prisma } from "@cookunity-seo-agent/db";
import {
  getConfig,
  log,
  mockBrief,
  mockDraft,
  type ContentBrief,
  type Draft,
  type OutlinePackage,
  type OpportunityPath,
  type OpportunityType,
  type RowStatus,
  type WorkflowStepName,
  type WorkflowStepStatus,
} from "@cookunity-seo-agent/shared";
import { KeywordIntelligenceService } from "./keyword-intelligence-service";
import { TopicPrioritizationService } from "./topic-prioritization-service";
import { OutlineGenerationService } from "./outline-generation-service";
import { DraftingService } from "./drafting-service";
import { ReviewDocumentService } from "./review-document-service";
import { EditorialQaAgent } from "../agents/editorial-qa-agent";
import { PublishingService } from "./publishing-service";

function toJsonInput(value: unknown) {
  return value as never;
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function keywordToSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function inferIntent(keyword: string, path: OpportunityPath): string {
  const normalized = keyword.toLowerCase();
  if (path === "landing_page") {
    if (normalized.includes("vs") || normalized.includes("compare")) return "comparison";
    if (normalized.includes("price") || normalized.includes("cost")) return "cost";
    return "direct_trial";
  }
  if (normalized.includes("what is") || normalized.includes("guide") || normalized.includes("how")) return "education";
  if (normalized.includes("best") || normalized.includes("ideas") || normalized.includes("foods")) return "curated_roundup";
  return "capture";
}

function readBrief(value: unknown): ContentBrief | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ContentBrief;
}

function readDraft(value: unknown): Draft | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as Draft;
}

function readOutlinePackage(value: unknown): OutlinePackage | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as OutlinePackage;
}

function serializeError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown workflow error";
}

function getStepTimeoutMs(stepName: WorkflowStepName): number {
  switch (stepName) {
    case "discovery":
    case "prioritization":
      return 15000;
    case "brief":
    case "draft":
    case "qa":
    case "publish":
      return 30000;
    default:
      return 15000;
  }
}

const orderedSteps: WorkflowStepName[] = ["discovery", "prioritization", "brief", "draft", "qa", "publish"];

export class OpportunityWorkflowService {
  private readonly keywordIntelligence = new KeywordIntelligenceService();
  private readonly prioritization = new TopicPrioritizationService();
  private readonly outlineGeneration = new OutlineGenerationService();
  private readonly drafting = new DraftingService();
  private readonly reviewDocuments = new ReviewDocumentService();
  private readonly editorialQa = new EditorialQaAgent();
  private readonly publishing = new PublishingService();

  async createOpportunity(input: {
    keyword: string;
    path: OpportunityPath;
    type: OpportunityType;
    pageIdea?: string;
    competitorPageUrl?: string;
  }) {
    const normalizedKeyword = normalizeKeyword(input.keyword);
    return prisma.opportunity.upsert({
      where: { normalizedKeyword },
      update: {
        keyword: input.keyword.trim(),
        path: input.path,
        type: input.type,
        pageIdea: input.pageIdea?.trim() || null,
        competitorPageUrl: input.competitorPageUrl?.trim() || null,
        intent: inferIntent(input.keyword, input.path),
      },
      create: {
        keyword: input.keyword.trim(),
        normalizedKeyword,
        path: input.path,
        type: input.type,
        pageIdea: input.pageIdea?.trim() || null,
        competitorPageUrl: input.competitorPageUrl?.trim() || null,
        intent: inferIntent(input.keyword, input.path),
      },
    });
  }

  async updateOpportunity(
    opportunityId: string,
    input: {
      keyword?: string;
      path?: OpportunityPath;
      type?: OpportunityType;
      pageIdea?: string | null;
      competitorPageUrl?: string | null;
    },
  ) {
    const existing = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!existing) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    const nextKeyword = input.keyword?.trim() || existing.keyword;
    const nextPath = input.path ?? existing.path;
    const nextType = input.type ?? existing.type;

    return prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        keyword: nextKeyword,
        normalizedKeyword: normalizeKeyword(nextKeyword),
        path: nextPath,
        type: nextType,
        ...(input.pageIdea !== undefined ? { pageIdea: input.pageIdea?.trim() || null } : {}),
        ...(input.competitorPageUrl !== undefined
          ? { competitorPageUrl: input.competitorPageUrl?.trim() || null }
          : {}),
        intent: inferIntent(nextKeyword, nextPath),
      },
    });
  }

  async runWorkflow(opportunityId: string) {
    const workflowRun = await this.ensureWorkflowRun(opportunityId, "manual_run");
    for (const step of orderedSteps) {
      if (step === "publish") {
        break;
      }
      await this.executeStep(opportunityId, step, {
        workflowRunId: workflowRun.id,
      });
      const refreshed = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
      if (!refreshed || refreshed.rowStatus === "failed" || refreshed.rowStatus === "blocked" || refreshed.rowStatus === "needs_review") {
        break;
      }
    }
    return this.getOpportunityDetail(opportunityId);
  }

  async executeStep(
    opportunityId: string,
    stepName: WorkflowStepName,
    options?: {
      workflowRunId?: string;
      revisionNote?: string | null;
      trigger?: string;
    },
  ) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        topicCandidate: true,
        workflowRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    const workflowRun =
      options?.workflowRunId
        ? await prisma.workflowRun.findUnique({ where: { id: options.workflowRunId } })
        : null;

    const activeRun =
      workflowRun ??
      (await this.ensureWorkflowRun(opportunityId, options?.trigger ?? `step_${stepName}`));

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { rowStatus: "running", lastError: null },
    });
    await prisma.workflowRun.update({
      where: { id: activeRun.id },
      data: { status: "running", currentStep: stepName, error: null },
    });

    const previousCount = await prisma.workflowStepRun.count({
      where: { workflowRunId: activeRun.id, stepName },
    });

    const stepRun = await prisma.workflowStepRun.create({
      data: {
        opportunityId,
        workflowRunId: activeRun.id,
        stepName,
        version: previousCount + 1,
        status: "running",
        startedAt: new Date(),
        ...(options?.revisionNote ? { revisionNote: options.revisionNote } : {}),
      },
    });

    try {
      const output = await this.runStepWithTimeout(opportunityId, stepName, stepRun.id);
      const status = this.getStepSuccessStatus(stepName, output);
      await prisma.workflowStepRun.update({
        where: { id: stepRun.id },
        data: {
          status,
          outputJson: toJsonInput(output),
          completedAt: new Date(),
          ...(this.getArtifactReference(stepName, output) ?? {}),
        },
      });

      const rowStatus = this.getRowStatusAfterStep(stepName, status);
      await prisma.workflowRun.update({
        where: { id: activeRun.id },
        data: {
          status: rowStatus,
          ...(stepName === "publish" ? { completedAt: new Date() } : {}),
        },
      });
      await prisma.opportunity.update({
        where: { id: opportunityId },
        data: { rowStatus },
      });

      await this.recordAudit("workflow_step_run", stepRun.id, `${stepName}:${status}`, "system", {
        opportunityId,
        workflowRunId: activeRun.id,
      });

      return this.getOpportunityDetail(opportunityId);
    } catch (error) {
      const fallbackOutput = await this.runFallbackStep(opportunityId, stepName, stepRun.id, error);
      if (fallbackOutput) {
        const fallbackStatus = this.getStepSuccessStatus(stepName, fallbackOutput);
        await prisma.workflowStepRun.update({
          where: { id: stepRun.id },
          data: {
            status: fallbackStatus,
            outputJson: toJsonInput(fallbackOutput),
            completedAt: new Date(),
            error: serializeError(error),
            ...(this.getArtifactReference(stepName, fallbackOutput) ?? {}),
          },
        });

        const rowStatus = this.getRowStatusAfterStep(stepName, fallbackStatus);
        await prisma.workflowRun.update({
          where: { id: activeRun.id },
          data: {
            status: rowStatus,
            ...(stepName === "publish" ? { completedAt: new Date() } : {}),
          },
        });
        await prisma.opportunity.update({
          where: { id: opportunityId },
          data: { rowStatus, lastError: null },
        });

        await this.recordAudit("workflow_step_run", stepRun.id, `${stepName}:${fallbackStatus}:fallback`, "system", {
          opportunityId,
          workflowRunId: activeRun.id,
          error: serializeError(error),
        });

        return this.getOpportunityDetail(opportunityId);
      }

      const message = serializeError(error);
      await prisma.workflowStepRun.update({
        where: { id: stepRun.id },
        data: {
          status: "failed",
          error: message,
          completedAt: new Date(),
        },
      });
      await prisma.workflowRun.update({
        where: { id: activeRun.id },
        data: { status: "failed", error: message },
      });
      await prisma.opportunity.update({
        where: { id: opportunityId },
        data: { rowStatus: "failed", lastError: message },
      });
      await this.recordAudit("workflow_step_run", stepRun.id, `${stepName}:failed`, "system", {
        opportunityId,
        error: message,
      });
      throw error;
    }
  }

  async approveStep(stepRunId: string, approvedBy: string) {
    const stepRun = await prisma.workflowStepRun.findUnique({
      where: { id: stepRunId },
      include: { opportunity: true, workflowRun: true },
    });
    if (!stepRun) {
      throw new Error(`Step run not found: ${stepRunId}`);
    }

    await prisma.workflowStepRun.update({
      where: { id: stepRunId },
      data: {
        status: "approved",
        approvedBy,
        approvedAt: new Date(),
      },
    });

    let rowStatus: RowStatus = stepRun.opportunity.rowStatus;
    if (stepRun.stepName === "qa") {
      rowStatus = "approved";
      await prisma.opportunity.update({
        where: { id: stepRun.opportunityId },
        data: { rowStatus },
      });
      await prisma.workflowRun.update({
        where: { id: stepRun.workflowRunId },
        data: { status: rowStatus },
      });
    }

    await this.recordAudit("workflow_step_run", stepRunId, `${stepRun.stepName}:approved`, "reviewer", {
      opportunityId: stepRun.opportunityId,
      approvedBy,
    });

    return this.getOpportunityDetail(stepRun.opportunityId);
  }

  async requestRevision(stepRunId: string, requestedBy: string, note: string) {
    const stepRun = await prisma.workflowStepRun.findUnique({
      where: { id: stepRunId },
    });
    if (!stepRun) {
      throw new Error(`Step run not found: ${stepRunId}`);
    }

    await prisma.revisionNote.create({
      data: {
        opportunityId: stepRun.opportunityId,
        workflowStepRunId: stepRunId,
        note,
        requestedBy,
      },
    });

    await prisma.workflowStepRun.update({
      where: { id: stepRunId },
      data: {
        status: "needs_review",
        revisionNote: note,
      },
    });

    await prisma.opportunity.update({
      where: { id: stepRun.opportunityId },
      data: { rowStatus: "blocked", lastError: null },
    });
    await prisma.workflowRun.update({
      where: { id: stepRun.workflowRunId },
      data: { status: "blocked" },
    });

    await this.recordAudit("workflow_step_run", stepRunId, `${stepRun.stepName}:revision_requested`, "reviewer", {
      opportunityId: stepRun.opportunityId,
      note,
      requestedBy,
    });

    return this.getOpportunityDetail(stepRun.opportunityId);
  }

  async saveManualEdit(stepRunId: string, editedBy: string, manualOutput: unknown) {
    const stepRun = await prisma.workflowStepRun.findUnique({
      where: { id: stepRunId },
    });
    if (!stepRun) {
      throw new Error(`Step run not found: ${stepRunId}`);
    }

    await prisma.workflowStepRun.update({
      where: { id: stepRunId },
      data: {
        manualOutputJson: toJsonInput(manualOutput),
      },
    });

    if (stepRun.stepName === "draft" && stepRun.artifactId) {
      const manualDraft = manualOutput as Record<string, unknown>;
      const existing = await prisma.draft.findUnique({ where: { id: stepRun.artifactId } });
      const existingDraft = readDraft(existing?.draftJson);
      if (existing && existingDraft) {
        const nextDraft: Draft = {
          ...existingDraft,
          ...(typeof manualDraft.h1 === "string" ? { h1: manualDraft.h1 } : {}),
          ...(typeof manualDraft.intro === "string" ? { intro: manualDraft.intro } : {}),
          ...(typeof manualDraft.html === "string" ? { html: manualDraft.html } : {}),
        };
        await prisma.draft.update({
          where: { id: existing.id },
          data: {
            draftJson: toJsonInput(nextDraft),
            html: nextDraft.html,
          },
        });
      }
    }

    if (stepRun.stepName === "brief" && stepRun.artifactId) {
      const existing = await prisma.contentBrief.findUnique({ where: { id: stepRun.artifactId } });
      const existingBrief = readBrief(existing?.briefJson);
      const manualBrief = readBrief(manualOutput);
      const outlinePackage = readOutlinePackage(
        manualBrief?.briefJson && typeof manualBrief.briefJson === "object"
          ? (manualBrief.briefJson as Record<string, unknown>).outlinePackage
          : undefined,
      );
      if (existing && existingBrief && manualBrief) {
        await prisma.contentBrief.update({
          where: { id: existing.id },
          data: {
            primaryKeyword: manualBrief.primaryKeyword,
            secondaryKeywordsJson: toJsonInput(manualBrief.secondaryKeywords),
            briefJson: toJsonInput(manualBrief),
          },
        });

        await prisma.outline.updateMany({
          where: { topicCandidateId: existing.topicCandidateId },
          data: {
            outlineJson: toJsonInput(outlinePackage ?? manualBrief.briefJson),
          },
        });
      }
    }

    await this.recordAudit("workflow_step_run", stepRunId, `${stepRun.stepName}:manual_edit`, "reviewer", {
      opportunityId: stepRun.opportunityId,
      editedBy,
    });

    return this.getOpportunityDetail(stepRun.opportunityId);
  }

  async rerunStep(stepRunId: string, rerunBy: string, note?: string) {
    const stepRun = await prisma.workflowStepRun.findUnique({
      where: { id: stepRunId },
    });
    if (!stepRun) {
      throw new Error(`Step run not found: ${stepRunId}`);
    }

    if (note) {
      await prisma.revisionNote.create({
        data: {
          opportunityId: stepRun.opportunityId,
          workflowStepRunId: stepRun.id,
          note,
          requestedBy: rerunBy,
        },
      });
    }

    await this.recordAudit("workflow_step_run", stepRunId, `${stepRun.stepName}:rerun_requested`, "reviewer", {
      opportunityId: stepRun.opportunityId,
      rerunBy,
      note,
    });

    return this.executeStep(stepRun.opportunityId, stepRun.stepName, {
      workflowRunId: stepRun.workflowRunId,
      revisionNote: note ?? null,
      trigger: "manual_rerun",
    });
  }

  async publishOpportunity(opportunityId: string, actor: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        workflowRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            stepRuns: {
              orderBy: [{ createdAt: "desc" }],
            },
          },
        },
      },
    });
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    const latestQa = opportunity.workflowRuns[0]?.stepRuns.find((step) => step.stepName === "qa");
    if (!latestQa || latestQa.status !== "approved") {
      throw new Error("QA approval is required before publishing.");
    }

    await this.recordAudit("opportunity", opportunityId, "publish:requested", "reviewer", { actor });
    return this.executeStep(opportunityId, "publish", {
      trigger: "manual_publish",
      ...(opportunity.workflowRuns[0]?.id ? { workflowRunId: opportunity.workflowRuns[0].id } : {}),
    });
  }

  async getOpportunityDetail(opportunityId: string) {
    return prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        topicCandidate: true,
        revisionNotes: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        publishResults: {
          orderBy: { createdAt: "desc" },
          take: 10,
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
    });
  }

  private async runStepImplementation(opportunityId: string, stepName: WorkflowStepName, stepRunId: string) {
    switch (stepName) {
      case "discovery":
        return this.runDiscovery(opportunityId);
      case "prioritization":
        return this.runPrioritization(opportunityId);
      case "brief":
        return this.runBrief(opportunityId);
      case "draft":
        return this.runDraft(opportunityId);
      case "qa":
        return this.runQa(opportunityId);
      case "publish":
        return this.runPublish(opportunityId, stepRunId);
      default:
        throw new Error(`Unsupported step: ${stepName satisfies never}`);
    }
  }

  private runStepWithTimeout(opportunityId: string, stepName: WorkflowStepName, stepRunId: string) {
    const timeoutMs = getStepTimeoutMs(stepName);

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${stepName} timed out after ${Math.round(timeoutMs / 1000)}s.`));
      }, timeoutMs);

      this.runStepImplementation(opportunityId, stepName, stepRunId)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async runFallbackStep(
    opportunityId: string,
    stepName: WorkflowStepName,
    stepRunId: string,
    error: unknown,
  ): Promise<unknown | null> {
    switch (stepName) {
      case "discovery":
        return this.runFallbackDiscovery(opportunityId, error);
      case "prioritization":
        return this.runFallbackPrioritization(opportunityId, error);
      case "brief":
        return this.runFallbackBrief(opportunityId, error);
      case "draft":
        return this.runFallbackDraft(opportunityId, error);
      case "qa":
        return this.runFallbackQa(opportunityId, error);
      case "publish":
        return null;
      default:
        return null;
    }
  }

  private async runDiscovery(opportunityId: string) {
    const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }
    const discovered = await this.keywordIntelligence.discover([opportunity.keyword]);
    const matched =
      discovered.find((candidate) => normalizeKeyword(candidate.keyword) === opportunity.normalizedKeyword) ??
      discovered[0];

    const keyword = await prisma.keyword.upsert({
      where: { normalizedTerm: opportunity.normalizedKeyword },
      update: {
        term: opportunity.keyword,
        source: matched?.source ?? "manual",
        searchVolume: matched?.searchVolume ?? 0,
        keywordDifficulty: matched?.keywordDifficulty ?? 0,
        trendVelocity: matched?.trendVelocity ?? 0,
      },
      create: {
        term: opportunity.keyword,
        normalizedTerm: opportunity.normalizedKeyword,
        source: matched?.source ?? "manual",
        searchVolume: matched?.searchVolume ?? 0,
        keywordDifficulty: matched?.keywordDifficulty ?? 0,
        trendVelocity: matched?.trendVelocity ?? 0,
      },
    });

    const topicCandidate = await prisma.topicCandidate.upsert({
      where: { normalizedKeyword: opportunity.normalizedKeyword },
      update: {
        title: opportunity.keyword,
        keywordId: keyword.id,
        source: matched?.source ?? "manual",
        workflowState: "discovered",
      },
      create: {
        title: opportunity.keyword,
        normalizedKeyword: opportunity.normalizedKeyword,
        keywordId: keyword.id,
        source: matched?.source ?? "manual",
        workflowState: "discovered",
        recommendation: "monitor",
        totalScore: 0,
        scoreBreakdownJson: {},
        rationale: "Opportunity discovered from operator queue.",
        topicType: "new_article",
      },
    });

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        topicCandidateId: topicCandidate.id,
        intent: matched?.intent ?? opportunity.intent,
      },
    });

    return {
      keyword: opportunity.keyword,
      path: opportunity.path,
      intent: matched?.intent ?? opportunity.intent,
      candidates: discovered,
      matchedCandidate: matched ?? null,
    };
  }

  private async runPrioritization(opportunityId: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { topicCandidate: { include: { keyword: true } } },
    });
    if (!opportunity?.topicCandidate?.keyword) {
      throw new Error("Run discovery before prioritization.");
    }

    const existingInventory = await this.getExistingInventory();
    const candidate = opportunity.topicCandidate.keyword;
    const prioritized = this.prioritization.prioritize(
      [
        {
          keyword: opportunity.keyword,
          searchVolume: candidate.searchVolume,
          keywordDifficulty: candidate.keywordDifficulty,
          trendVelocity: candidate.trendVelocity,
          businessRelevance: this.estimateBusinessRelevance(opportunity.keyword, opportunity.path),
          conversionIntent: this.estimateConversionIntent(opportunity.intent, opportunity.path),
          competitorGap: opportunity.type === "lp_optimization" ? 78 : 62,
          freshnessOpportunity: opportunity.path === "blog" ? 74 : 56,
          clusterValue: opportunity.path === "blog" ? 70 : 85,
          authorityFit: opportunity.path === "landing_page" ? 88 : 76,
        },
      ],
      existingInventory,
    )[0];

    if (!prioritized) {
      throw new Error("No prioritization output generated.");
    }

    await prisma.topicCandidate.update({
      where: { id: opportunity.topicCandidate.id },
      data: {
        workflowState: "queued",
        recommendation: prioritized.recommendation,
        totalScore: prioritized.totalScore,
        scoreBreakdownJson: toJsonInput(prioritized.breakdown),
        rationale: prioritized.explanation,
        cannibalizationRisk: prioritized.cannibalizationRisk,
        topicType: prioritized.topicType,
      },
    });

    return {
      keyword: prioritized.keyword,
      totalScore: prioritized.totalScore,
      recommendation: prioritized.recommendation,
      topicType: prioritized.topicType,
      explanation: prioritized.explanation,
      breakdown: prioritized.breakdown,
      path: opportunity.path,
      intent: opportunity.intent,
    };
  }

  private async runBrief(opportunityId: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { topicCandidate: true },
    });
    if (!opportunity?.topicCandidate) {
      throw new Error("Run discovery and prioritization before brief generation.");
    }

    const brief = await this.outlineGeneration.generate({
      id: opportunity.topicCandidate.id,
      keyword: opportunity.keyword,
      recommendation: opportunity.topicCandidate.recommendation,
      path: opportunity.path,
      intent: opportunity.intent,
    });
    const enrichedBrief = this.applyPathContextToBrief(brief, opportunity.path, opportunity.intent);

    const briefRecord = await prisma.contentBrief.create({
      data: {
        topicCandidateId: opportunity.topicCandidate.id,
        promptVersionId: "outline_generation:v1",
        primaryKeyword: enrichedBrief.primaryKeyword,
        secondaryKeywordsJson: toJsonInput(enrichedBrief.secondaryKeywords),
        briefJson: toJsonInput(enrichedBrief),
      },
    });
    await prisma.outline.create({
      data: {
        topicCandidateId: opportunity.topicCandidate.id,
        promptVersionId: "outline_generation:v1",
        outlineJson: toJsonInput(enrichedBrief.briefJson),
      },
    });
    await prisma.topicCandidate.update({
      where: { id: opportunity.topicCandidate.id },
      data: { workflowState: "outline_generated" },
    });

    return {
      ...enrichedBrief,
      artifactId: briefRecord.id,
      path: opportunity.path,
      reviewLabel: opportunity.path === "blog" ? "Capture-focused brief" : "Trial-focused LP brief",
    };
  }

  private async runDraft(opportunityId: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        topicCandidate: {
          include: {
            briefs: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    const briefRecord = opportunity?.topicCandidate?.briefs[0];
    const briefStep = await prisma.workflowStepRun.findFirst({
      where: {
        opportunityId,
        stepName: "brief",
        status: { in: ["completed", "approved", "needs_review"] },
      },
      orderBy: [{ createdAt: "desc" }, { version: "desc" }],
    });
    const brief = readBrief(briefStep?.manualOutputJson) ?? readBrief(briefStep?.outputJson) ?? readBrief(briefRecord?.briefJson);
    if (!opportunity || !brief || !briefRecord) {
      throw new Error("Generate a brief before drafting.");
    }

    const draft = await this.drafting.generate(brief);
    const enrichedDraft = this.applyPathContextToDraft(draft, opportunity.path);
    const reviewDoc = await this.reviewDocuments.createReviewDocument({
      brief,
      draft: enrichedDraft,
      reviewerEmail: getConfig().ADMIN_EMAIL,
    });

    const draftRecord = await prisma.draft.create({
      data: {
        topicCandidateId: opportunity.topicCandidateId!,
        briefId: briefRecord.id,
        promptVersionId: enrichedDraft.promptVersionId,
        draftJson: toJsonInput({
          ...enrichedDraft,
          reviewDocUrl: reviewDoc.url,
          reviewDocProvider: reviewDoc.provider,
          reviewDocId: reviewDoc.id,
        }),
        html: enrichedDraft.html,
        markdown: JSON.stringify(enrichedDraft.sections),
      },
    });
    await prisma.topicCandidate.update({
      where: { id: opportunity.topicCandidateId! },
      data: { workflowState: "draft_generated" },
    });

    return {
      ...enrichedDraft,
      reviewDocUrl: reviewDoc.url,
      reviewDocProvider: reviewDoc.provider,
      artifactId: draftRecord.id,
    };
  }

  private async runQa(opportunityId: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        topicCandidate: {
          include: {
            briefs: { orderBy: { createdAt: "desc" }, take: 1 },
            drafts: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });
    const brief = readBrief(opportunity?.topicCandidate?.briefs[0]?.briefJson);
    const draft = readDraft(opportunity?.topicCandidate?.drafts[0]?.draftJson);
    if (!opportunity || !brief || !draft || !opportunity.topicCandidate) {
      throw new Error("Brief and draft are required before QA.");
    }

    const qaResult = await this.editorialQa.execute(
      {
        brief,
        draft,
      },
      {
        runId: `qa_${opportunityId}`,
        entityId: opportunityId,
        attempt: 1,
      },
    );

    await prisma.topicCandidate.update({
      where: { id: opportunity.topicCandidate.id },
      data: { workflowState: qaResult.output.passed ? "in_review" : "revision_requested" },
    });

    return {
      ...qaResult.output,
      path: opportunity.path,
      reviewLabel:
        opportunity.path === "blog"
          ? "Review for email capture readiness"
          : "Review for trial conversion readiness",
    };
  }

  private async runPublish(opportunityId: string, stepRunId: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        topicCandidate: {
          include: {
            drafts: { orderBy: { createdAt: "desc" }, take: 1 },
            publications: { orderBy: { updatedAt: "desc" }, take: 1 },
          },
        },
      },
    });
    const draftRecord = opportunity?.topicCandidate?.drafts[0];
    const draft = readDraft(draftRecord?.draftJson);
    if (!opportunity || !draft || !draftRecord || !opportunity.topicCandidate) {
      throw new Error("Draft is required before publishing.");
    }

    const latestStep = await prisma.workflowStepRun.findUnique({ where: { id: stepRunId } });
    const manualOutput = latestStep?.manualOutputJson as Record<string, unknown> | null;
    const publishDraft: Draft =
      manualOutput && typeof manualOutput === "object"
        ? {
            ...draft,
            ...(typeof manualOutput.h1 === "string" ? { h1: manualOutput.h1 } : {}),
            ...(typeof manualOutput.intro === "string" ? { intro: manualOutput.intro } : {}),
            ...(typeof manualOutput.html === "string" ? { html: manualOutput.html } : {}),
          }
        : draft;

    const result = await this.publishing.publishArticle({
      draft: publishDraft,
      tags: [opportunity.path === "blog" ? "blog" : "landing-page"],
      categories: [opportunity.path === "blog" ? "organic-capture" : "trial-conversion"],
      approved: true,
      ...(opportunity.topicCandidate.publications[0]?.strapiEntryId
        ? { existingEntryId: opportunity.topicCandidate.publications[0].strapiEntryId }
        : {}),
      ...(opportunity.topicCandidate.publications[0]?.strapiDocumentId
        ? { existingDocumentId: opportunity.topicCandidate.publications[0].strapiDocumentId }
        : {}),
      ...(publishDraft.metaDescriptionOptions[0]
        ? { excerpt: publishDraft.metaDescriptionOptions[0] }
        : {}),
    });

    const publication = opportunity.topicCandidate.publications[0]
      ? await prisma.publication.update({
          where: { id: opportunity.topicCandidate.publications[0].id },
          data: {
            draftId: draftRecord.id,
            strapiEntryId: result.entryId,
            slug: publishDraft.slugRecommendation,
            status: "published",
            metadataJson: toJsonInput(result),
            fieldMappingJson: toJsonInput(result.fieldMapping),
            publishedAt: new Date(),
            ...(result.documentId ? { strapiDocumentId: result.documentId } : {}),
          },
        })
      : await prisma.publication.create({
          data: {
            topicCandidateId: opportunity.topicCandidate.id,
            draftId: draftRecord.id,
            strapiEntryId: result.entryId,
            slug: publishDraft.slugRecommendation,
            status: "published",
            metadataJson: toJsonInput(result),
            fieldMappingJson: toJsonInput(result.fieldMapping),
            publishedAt: new Date(),
            ...(result.documentId ? { strapiDocumentId: result.documentId } : {}),
          },
        });

    await prisma.publishResult.create({
      data: {
        opportunityId,
        workflowStepRunId: stepRunId,
        publicationId: publication.id,
        status: "published",
        message: "Published to Strapi",
        metadataJson: toJsonInput(result),
      },
    });

    await prisma.topicCandidate.update({
      where: { id: opportunity.topicCandidate.id },
      data: { workflowState: "published" },
    });

    return {
      entryId: result.entryId,
      documentId: result.documentId,
      slug: publishDraft.slugRecommendation,
      publicationId: publication.id,
    };
  }

  private async runFallbackDiscovery(opportunityId: string, error: unknown): Promise<Record<string, unknown>> {
    const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    const keyword = await prisma.keyword.upsert({
      where: { normalizedTerm: opportunity.normalizedKeyword },
      update: {
        term: opportunity.keyword,
        source: "manual",
        searchVolume: 1200,
        keywordDifficulty: 24,
        trendVelocity: 8,
      },
      create: {
        term: opportunity.keyword,
        normalizedTerm: opportunity.normalizedKeyword,
        source: "manual",
        searchVolume: 1200,
        keywordDifficulty: 24,
        trendVelocity: 8,
      },
    });

    const topicCandidate = await prisma.topicCandidate.upsert({
      where: { normalizedKeyword: opportunity.normalizedKeyword },
      update: {
        title: opportunity.keyword,
        keywordId: keyword.id,
        source: "manual",
        workflowState: "discovered",
        rationale: "Fallback discovery created from operator-entered opportunity.",
      },
      create: {
        title: opportunity.keyword,
        normalizedKeyword: opportunity.normalizedKeyword,
        keywordId: keyword.id,
        source: "manual",
        workflowState: "discovered",
        recommendation: "monitor",
        totalScore: 0,
        scoreBreakdownJson: {},
        rationale: "Fallback discovery created from operator-entered opportunity.",
        topicType: "new_article",
      },
    });

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        topicCandidateId: topicCandidate.id,
        intent: opportunity.intent,
      },
    });

    return {
      keyword: opportunity.keyword,
      path: opportunity.path,
      intent: opportunity.intent,
      candidates: [
        {
          keyword: opportunity.keyword,
          source: "manual",
          searchVolume: 1200,
          keywordDifficulty: 24,
          trendVelocity: 8,
          intent: opportunity.intent,
          notes: `Fallback discovery used because: ${serializeError(error)}`,
        },
      ],
      matchedCandidate: {
        keyword: opportunity.keyword,
        source: "manual",
        searchVolume: 1200,
        keywordDifficulty: 24,
        trendVelocity: 8,
        intent: opportunity.intent,
        notes: `Fallback discovery used because: ${serializeError(error)}`,
      },
      warning: `Fallback discovery used because: ${serializeError(error)}`,
    };
  }

  private async runFallbackPrioritization(opportunityId: string, error: unknown): Promise<Record<string, unknown>> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { topicCandidate: { include: { keyword: true } } },
    });
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }
    if (!opportunity.topicCandidate) {
      await this.runFallbackDiscovery(opportunityId, error);
      return this.runFallbackPrioritization(opportunityId, error);
    }

    await prisma.topicCandidate.update({
      where: { id: opportunity.topicCandidate.id },
      data: {
        workflowState: "queued",
        recommendation: opportunity.path === "landing_page" ? "write_now" : "monitor",
        totalScore: opportunity.path === "landing_page" ? 82 : 74,
        scoreBreakdownJson: toJsonInput({
          volumeScore: 62,
          difficultyInverseScore: 68,
          trendScore: 58,
          businessRelevanceScore: opportunity.path === "landing_page" ? 92 : 76,
          conversionIntentScore: opportunity.path === "landing_page" ? 90 : 62,
          competitorGapScore: 64,
          freshnessScore: 55,
          clusterValueScore: 72,
          authorityFitScore: 81,
        }),
        rationale: `Fallback prioritization used because: ${serializeError(error)}`,
        cannibalizationRisk: 18,
        topicType: opportunity.path === "landing_page" ? "support_cluster" : "new_article",
      },
    });

    return {
      keyword: opportunity.keyword,
      totalScore: opportunity.path === "landing_page" ? 82 : 74,
      recommendation: opportunity.path === "landing_page" ? "write_now" : "monitor",
      topicType: opportunity.path === "landing_page" ? "support_cluster" : "new_article",
      explanation: `Fallback prioritization used because: ${serializeError(error)}`,
      breakdown: {
        volumeScore: 62,
        difficultyInverseScore: 68,
        trendScore: 58,
        businessRelevanceScore: opportunity.path === "landing_page" ? 92 : 76,
        conversionIntentScore: opportunity.path === "landing_page" ? 90 : 62,
        competitorGapScore: 64,
        freshnessScore: 55,
        clusterValueScore: 72,
        authorityFitScore: 81,
      },
      path: opportunity.path,
      intent: opportunity.intent,
      warning: `Fallback prioritization used because: ${serializeError(error)}`,
    };
  }

  private async runFallbackBrief(opportunityId: string, error: unknown): Promise<Record<string, unknown>> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { topicCandidate: true },
    });
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }
    if (!opportunity.topicCandidate) {
      await this.runFallbackDiscovery(opportunityId, error);
      await this.runFallbackPrioritization(opportunityId, error);
      return this.runFallbackBrief(opportunityId, error);
    }

    const keyword = opportunity.keyword;
    const enrichedBrief = this.applyPathContextToBrief(
      {
        ...mockBrief,
        id: `brief_${opportunity.topicCandidate.id}`,
        topicId: opportunity.topicCandidate.id,
        primaryKeyword: keyword,
        secondaryKeywords: [
          `${keyword} guide`,
          `best ${keyword}`,
          `${keyword} ideas`,
        ],
        titleOptions: [
          this.titleCase(keyword),
          `${this.titleCase(keyword)} guide`,
          `How to choose ${keyword}`,
        ],
        intentSummary: `Fallback brief used because: ${serializeError(error)}`,
      },
      opportunity.path,
      opportunity.intent,
    );

    const briefRecord = await prisma.contentBrief.create({
      data: {
        topicCandidateId: opportunity.topicCandidate.id,
        promptVersionId: "outline_generation:fallback",
        primaryKeyword: enrichedBrief.primaryKeyword,
        secondaryKeywordsJson: toJsonInput(enrichedBrief.secondaryKeywords),
        briefJson: toJsonInput(enrichedBrief),
      },
    });
    await prisma.outline.create({
      data: {
        topicCandidateId: opportunity.topicCandidate.id,
        promptVersionId: "outline_generation:fallback",
        outlineJson: toJsonInput(enrichedBrief.briefJson),
      },
    });
    await prisma.topicCandidate.update({
      where: { id: opportunity.topicCandidate.id },
      data: { workflowState: "outline_generated" },
    });

    return {
      ...enrichedBrief,
      artifactId: briefRecord.id,
      path: opportunity.path,
      reviewLabel: opportunity.path === "blog" ? "Capture-focused brief" : "Trial-focused LP brief",
      warning: `Fallback brief used because: ${serializeError(error)}`,
    };
  }

  private async runFallbackDraft(opportunityId: string, error: unknown): Promise<Record<string, unknown>> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        topicCandidate: {
          include: {
            briefs: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }
    if (!opportunity.topicCandidate?.briefs[0]) {
      await this.runFallbackBrief(opportunityId, error);
      return this.runFallbackDraft(opportunityId, error);
    }

    const briefRecord = opportunity.topicCandidate.briefs[0];
    const draft = this.applyPathContextToDraft(
      {
        ...mockDraft,
        id: `draft_${opportunity.topicCandidate.id}`,
        topicId: opportunity.topicCandidate.id,
        briefId: briefRecord.id,
        slugRecommendation: keywordToSlug(opportunity.keyword),
        h1: this.titleCase(opportunity.keyword),
        intro: `Fallback draft generated for ${opportunity.keyword} because the primary drafting path failed.`,
        html: this.buildFallbackHtml(opportunity.keyword, opportunity.path, serializeError(error)),
        titleTagOptions: [
          `${this.titleCase(opportunity.keyword)} | CookUnity`,
        ],
        metaDescriptionOptions: [
          `Fallback draft for ${opportunity.keyword}. Review and refine before publishing.`,
        ],
      },
      opportunity.path,
    );

    const draftRecord = await prisma.draft.create({
      data: {
        topicCandidateId: opportunity.topicCandidate.id,
        briefId: briefRecord.id,
        promptVersionId: "draft:fallback",
        draftJson: toJsonInput(draft),
        html: draft.html,
        markdown: JSON.stringify(draft.sections),
      },
    });
    await prisma.topicCandidate.update({
      where: { id: opportunity.topicCandidate.id },
      data: { workflowState: "draft_generated" },
    });

    return {
      ...draft,
      artifactId: draftRecord.id,
      warning: `Fallback draft used because: ${serializeError(error)}`,
    };
  }

  private async runFallbackQa(opportunityId: string, error: unknown): Promise<Record<string, unknown>> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { topicCandidate: true },
    });
    if (!opportunity?.topicCandidate) {
      throw new Error("Draft and brief are required before QA.");
    }

    await prisma.topicCandidate.update({
      where: { id: opportunity.topicCandidate.id },
      data: { workflowState: "in_review" },
    });

    return {
      passed: true,
      flags: [`Fallback QA used because: ${serializeError(error)}`],
      requiresHumanReview: true,
      normalizedDraft: {
        ...mockDraft,
        id: `draft_${opportunity.topicCandidate.id}`,
        topicId: opportunity.topicCandidate.id,
        slugRecommendation: keywordToSlug(opportunity.keyword),
        h1: this.titleCase(opportunity.keyword),
        html: this.buildFallbackHtml(opportunity.keyword, opportunity.path, serializeError(error)),
      },
      path: opportunity.path,
      reviewLabel:
        opportunity.path === "blog"
          ? "Review for email capture readiness"
          : "Review for trial conversion readiness",
      warning: `Fallback QA used because: ${serializeError(error)}`,
    };
  }

  private buildFallbackHtml(keyword: string, path: OpportunityPath, errorMessage: string) {
    const cta =
      path === "blog"
        ? "Get menu updates by email and keep comparing options before you trial."
        : "See this week's menu and start your trial when you're ready.";

    return `<article><h1>${this.titleCase(keyword)}</h1><p>This fallback draft was generated because the primary workflow path failed: ${errorMessage}</p><h2>What matters most</h2><p>Use this version as a working draft so the operator can continue editing and review without blocking the workflow.</p><h2>How CookUnity should frame this topic</h2><p>${path === "blog" ? "Keep the article focused on capture and nurture, not direct conversion." : "Keep the page focused on direct-trial conversion and clear proof points."}</p><h2>Bottom line</h2><p>${cta}</p></article>`;
  }

  private titleCase(value: string) {
    return value.replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private async ensureWorkflowRun(opportunityId: string, trigger: string) {
    const existing = await prisma.workflowRun.findFirst({
      where: {
        opportunityId,
        status: { in: ["idle", "running", "blocked", "needs_review", "approved"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return existing;
    }
    return prisma.workflowRun.create({
      data: {
        opportunityId,
        trigger,
        status: "idle",
      },
    });
  }

  private getStepSuccessStatus(stepName: WorkflowStepName, output: unknown): WorkflowStepStatus {
    if (stepName === "qa") {
      return "needs_review";
    }
    if (stepName === "publish") {
      return "approved";
    }
    if (stepName === "brief" || stepName === "draft") {
      return "completed";
    }
    return "completed";
  }

  private getRowStatusAfterStep(stepName: WorkflowStepName, stepStatus: WorkflowStepStatus): RowStatus {
    if (stepStatus === "failed") return "failed";
    if (stepName === "qa") return "needs_review";
    if (stepName === "publish") return "published";
    return "running";
  }

  private getArtifactReference(stepName: WorkflowStepName, output: unknown) {
    if (!output || typeof output !== "object") return null;
    const record = output as Record<string, unknown>;
    if (stepName === "brief" && typeof record.artifactId === "string") {
      return { artifactType: "ContentBrief", artifactId: record.artifactId };
    }
    if (stepName === "draft" && typeof record.artifactId === "string") {
      return { artifactType: "Draft", artifactId: record.artifactId };
    }
    return null;
  }

  private applyPathContextToBrief(brief: ContentBrief, path: OpportunityPath, intent: string): ContentBrief {
    const briefJsonRecord =
      brief.briefJson && typeof brief.briefJson === "object" ? brief.briefJson : {};
    const outlinePackage = readOutlinePackage(
      (briefJsonRecord as Record<string, unknown>).outlinePackage,
    );

    if (path === "blog") {
      return {
        ...brief,
        ctaRecommendations: [
          "Get CookUnity menu updates by email",
          "Download the guide and comparison worksheet",
          ...brief.ctaRecommendations,
        ],
        briefJson: {
          ...briefJsonRecord,
          path,
          successMetric: "capture_rate",
          workflowLabel: "Blog → email capture → nurture → trial",
          intent,
          ...(outlinePackage
            ? {
                outlinePackage: {
                  ...outlinePackage,
                  analysis: {
                    ...outlinePackage.analysis,
                    searchIntent: intent,
                  },
                },
              }
            : {}),
        },
      };
    }

    return {
      ...brief,
      ctaRecommendations: [
        "Start your CookUnity trial",
        "See this week's menu",
        ...brief.ctaRecommendations,
      ],
      briefJson: {
        ...briefJsonRecord,
        path,
        successMetric: "checkout_cvr",
        workflowLabel: "Landing pages → direct trial",
        intent,
        ...(outlinePackage
          ? {
              outlinePackage: {
                ...outlinePackage,
                analysis: {
                  ...outlinePackage.analysis,
                  searchIntent: intent,
                },
              },
            }
          : {}),
      },
    };
  }

  private applyPathContextToDraft(draft: Draft, path: OpportunityPath): Draft {
    if (path === "blog") {
      return {
        ...draft,
        ctaSuggestions: [
          "Get menu updates and fresh ideas by email",
          "Download the comparison guide",
          ...draft.ctaSuggestions,
        ],
        editorNotes: [
          "This draft should drive email capture, not direct checkout conversion.",
          ...draft.editorNotes,
        ],
      };
    }
    return {
      ...draft,
      ctaSuggestions: [
        "Start your trial",
        "See this week's menu",
        ...draft.ctaSuggestions,
      ],
      editorNotes: [
        "This draft should optimize for direct trial conversion rather than nurture capture.",
        ...draft.editorNotes,
      ],
    };
  }

  private async getExistingInventory() {
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

  private estimateBusinessRelevance(keyword: string, path: OpportunityPath) {
    const normalized = keyword.toLowerCase();
    if (path === "landing_page") return normalized.includes("delivery") || normalized.includes("cost") ? 94 : 82;
    return normalized.includes("ideas") || normalized.includes("foods") ? 72 : 84;
  }

  private estimateConversionIntent(intent: string, path: OpportunityPath) {
    if (path === "landing_page") return intent === "comparison" || intent === "direct_trial" ? 92 : 80;
    return intent === "capture" || intent === "education" ? 68 : 58;
  }

  private async recordAudit(entityType: string, entityId: string, action: string, actorType: string, payload: Record<string, unknown>) {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        actorType,
        payload: toJsonInput(payload),
      },
    });
    log("info", "Opportunity workflow audit", {
      service: "opportunity-workflow",
      entityType,
      entityId,
      action,
      actorType,
    });
  }
}
