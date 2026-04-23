import {
  agentNames,
  getConfig,
  mockBrief,
  mockDraft,
  mockOptimizationTask,
  mockTopicCandidates,
  type ContentBrief,
  type Draft,
} from "@cookunity-seo-agent/shared";
import { safeListWorkflowGridRows } from "./workflow-grid-store";
import { isDatabaseReady } from "./runtime";

export interface DashboardTopicDraftSummary {
  id: string;
  reviewDocUrl?: string;
  reviewDocProvider?: string;
  approvalDecision?: string;
  approvalNotes?: string;
}

export interface DashboardMetricSnapshotSummary {
  id: string;
  capturedAt: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  conversions: number;
}

export interface DashboardOptimizationTaskSummary {
  id: string;
  type: string;
  priority: string;
  reason: string;
  actions: string[];
  createdAt: string;
}

export interface DashboardPublicationSummary {
  id: string;
  slug: string;
  status: string;
  title: string;
  publishedAt?: string;
  metricSnapshots: DashboardMetricSnapshotSummary[];
  optimizationTasks: DashboardOptimizationTaskSummary[];
}

export interface DashboardTopicSummary {
  id: string;
  title: string;
  workflowState: string;
  rationale: string;
  totalScore: number;
  recommendation: string;
  cannibalizationRisk: number;
  topicType: "new_article" | "refresh_existing" | "support_cluster" | "merge";
  drafts: DashboardTopicDraftSummary[];
  publications: DashboardPublicationSummary[];
}

export interface DashboardData {
  prioritized: Array<{
    keyword: string;
    totalScore: number;
    explanation: string;
    recommendation: string;
    cannibalizationRisk: number;
    topicType: "new_article" | "refresh_existing" | "support_cluster" | "merge";
    breakdown: Record<string, number>;
  }>;
  queuedTopics: Array<{
    keyword: string;
    explanation: string;
  }>;
  brief: ContentBrief;
  draft: Draft;
  qa: {
    passed: boolean;
    flags: string[];
    requiresHumanReview: boolean;
    normalizedDraft: Draft;
  };
  optimizationTask: {
    type: string;
    priority: string;
    reason: string;
    actions: string[];
  };
  workflowRun: {
    id: string;
    orchestrator: string;
    state: string;
    approvalRequired: boolean;
    currentTopic: string;
  };
  automationStatus: {
    discoveryCron: string;
    monitoringCron: string;
    refreshCron: string;
  };
  integrations: Array<{
    name: string;
    status: string;
  }>;
  agentControlRows: Array<{
    name: string;
    responsibility: string;
    inputContract: string;
    outputContract: string;
    latestStatus: string;
    latestRunAt: string;
    retrySafe: boolean;
    promptIsolation: string;
  }>;
  orchestratorTimeline: Array<{
    at: string;
    state: string;
    agent: string;
    summary: string;
  }>;
  agentNames: readonly string[];
  publishedInventory: DashboardPublicationSummary[];
  persistedTopics: DashboardTopicSummary[];
  performanceActions: {
    losingTraction: PerformanceActionItem[];
    lowCtr: PerformanceActionItem[];
    readyForRefresh: PerformanceActionItem[];
    weakConversion: PerformanceActionItem[];
  };
}

export interface PerformanceActionItem {
  id: string;
  title: string;
  signal: string;
  summary: string;
  actionLabel: string;
  href: string;
}

export interface WorkflowGridCell {
  step:
    | "keyword_discovery"
    | "topic_prioritization"
    | "content_brief_outline"
    | "article_drafting"
    | "editorial_qa"
    | "publishing_strapi"
    | "performance_monitoring_refresh";
  status: "pending" | "running" | "success" | "review_needed" | "waiting" | "published";
  label: string;
  detail: string;
}

export interface WorkflowGridRow {
  id: string;
  pillar: string;
  theme: string;
  primaryKeyword: string;
  searchVolume: string;
  contentType: string;
  cells: WorkflowGridCell[];
  reviewPackage?: {
    draftId: string;
    topicRationale: string;
    targetKeywords: string[];
    titleTag: string;
    metaDescription: string;
    internalLinks: string[];
    schema: string[];
    slug: string;
    h1: string;
    intro: string;
    sections: Draft["sections"];
    faq: Draft["faq"];
    ctaSuggestions: string[];
    editorNotes: string[];
    html: string;
    reviewDocUrl?: string;
    reviewDocProvider?: string;
  };
}

function buildPerformanceActions(persistedTopics: DashboardTopicSummary[]): DashboardData["performanceActions"] {
  const publishedTopics = persistedTopics.filter((topic) => topic.publications.length > 0);

  const losingTraction = publishedTopics
    .filter((topic) => {
      const snapshot = topic.publications[0]?.metricSnapshots[0];
      return snapshot ? snapshot.averagePosition > 8 || snapshot.clicks < 25 : false;
    })
    .slice(0, 6)
    .map((topic) => {
      const snapshot = topic.publications[0]?.metricSnapshots[0];
      return {
        id: `losing_${topic.id}`,
        title: topic.title,
        signal: "Losing traction",
        summary: snapshot
          ? `Average position is ${snapshot.averagePosition.toFixed(1)} with ${snapshot.clicks} clicks on the latest snapshot.`
          : "Latest performance is trending down.",
        actionLabel: "Create refresh brief",
        href: "/recommendations",
      };
    });

  const lowCtr = publishedTopics
    .filter((topic) => {
      const snapshot = topic.publications[0]?.metricSnapshots[0];
      return snapshot ? snapshot.impressions >= 250 && snapshot.ctr < 2 : false;
    })
    .slice(0, 6)
    .map((topic) => {
      const snapshot = topic.publications[0]?.metricSnapshots[0];
      return {
        id: `ctr_${topic.id}`,
        title: topic.title,
        signal: "Low CTR",
        summary: snapshot
          ? `${snapshot.impressions} impressions with ${snapshot.ctr.toFixed(2)}% CTR.`
          : "Search visibility is not turning into clicks.",
        actionLabel: "Rewrite title tag",
        href: "/review",
      };
    });

  const readyForRefresh = publishedTopics
    .filter((topic) => topic.publications[0]?.optimizationTasks.length)
    .slice(0, 6)
    .map((topic) => {
      const task = topic.publications[0]?.optimizationTasks[0];
      return {
        id: `refresh_${topic.id}`,
        title: topic.title,
        signal: "Ready for refresh",
        summary: task?.reason ?? "A refresh opportunity is already queued for this page.",
        actionLabel: "Open refresh task",
        href: "/recommendations",
      };
    });

  const weakConversion = publishedTopics
    .filter((topic) => {
      const snapshot = topic.publications[0]?.metricSnapshots[0];
      return snapshot ? snapshot.impressions >= 250 && snapshot.conversions < 3 : false;
    })
    .slice(0, 6)
    .map((topic) => {
      const snapshot = topic.publications[0]?.metricSnapshots[0];
      return {
        id: `conversion_${topic.id}`,
        title: topic.title,
        signal: "Weak conversion",
        summary: snapshot
          ? `${snapshot.impressions} impressions and ${snapshot.conversions} conversions on the latest snapshot.`
          : "Traffic is not turning into downstream action.",
        actionLabel: "Review CTA",
        href: "/review",
      };
    });

  return {
    losingTraction,
    lowCtr,
    readyForRefresh,
    weakConversion,
  };
}

async function getPrismaClient() {
  const dbModule = await import("@cookunity-seo-agent/db");
  return dbModule.prisma;
}

function defaultAgentControlRows() {
  return [
    {
      name: "keyword_discovery",
      responsibility: "Collect keyword opportunities from Ahrefs, GSC, Trends, and SERP-style discovery.",
      inputContract: "KeywordDiscoveryInput",
      outputContract: "KeywordDiscoveryOutput",
      latestStatus: "idle",
      latestRunAt: "not yet run",
      retrySafe: true,
      promptIsolation: "keyword_cluster:v1",
    },
    {
      name: "topic_prioritization",
      responsibility: "Score, rank, and classify candidate topics with cannibalization-aware logic.",
      inputContract: "TopicPrioritizationInput",
      outputContract: "TopicPrioritizationOutput",
      latestStatus: "idle",
      latestRunAt: "not yet run",
      retrySafe: true,
      promptIsolation: "topic_scoring:v1",
    },
    {
      name: "content_brief_outline",
      responsibility: "Generate SEO brief, title options, outline, FAQs, schema draft, and CTA recommendations.",
      inputContract: "ContentBriefAgentInput",
      outputContract: "ContentBriefAgentOutput",
      latestStatus: "idle",
      latestRunAt: "not yet run",
      retrySafe: true,
      promptIsolation: "outline_generation:v1",
    },
    {
      name: "article_drafting",
      responsibility: "Generate article draft package with metadata, sections, HTML, and editorial checklist.",
      inputContract: "ArticleDraftingInput",
      outputContract: "ArticleDraftingOutput",
      latestStatus: "idle",
      latestRunAt: "not yet run",
      retrySafe: true,
      promptIsolation: "article_draft:v1",
    },
    {
      name: "editorial_qa",
      responsibility: "Apply brand, quality, banned-phrase, and YMYL-adjacent checks before human review.",
      inputContract: "EditorialQaInput",
      outputContract: "EditorialQaOutput",
      latestStatus: "idle",
      latestRunAt: "not yet run",
      retrySafe: true,
      promptIsolation: "editorial_qa:v1",
    },
    {
      name: "publishing_strapi",
      responsibility: "Create/update/publish Strapi entries only after orchestrator approval.",
      inputContract: "PublishingAgentInput",
      outputContract: "PublishingAgentOutput",
      latestStatus: "waiting_for_approval",
      latestRunAt: "not yet run",
      retrySafe: true,
      promptIsolation: "publishing_strapi:v1",
    },
    {
      name: "performance_monitoring_refresh",
      responsibility: "Monitor post-publish performance and create refresh tasks for the orchestrator.",
      inputContract: "PerformanceMonitoringInput",
      outputContract: "PerformanceMonitoringOutput",
      latestStatus: "idle",
      latestRunAt: "not yet run",
      retrySafe: true,
      promptIsolation: "refresh_draft:v1",
    },
  ] as const;
}

async function getPersistedOperationalData() {
  if (!(await isDatabaseReady())) {
    return null;
  }

  try {
    const prisma = await getPrismaClient();
    const [topics, recentAuditLogs, latestOptimization, latestPublished, recentStepRuns] = await Promise.all([
      prisma.topicCandidate.findMany({
        include: {
          keyword: true,
          briefs: { orderBy: { createdAt: "desc" }, take: 1 },
          drafts: { orderBy: { createdAt: "desc" }, take: 1, include: { approvals: { orderBy: { createdAt: "desc" }, take: 1 } } },
          publications: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            include: {
              metricSnapshots: { orderBy: { capturedAt: "desc" }, take: 5 },
              optimizationTasks: { orderBy: { createdAt: "desc" }, take: 5 },
            },
          },
        },
        orderBy: [{ totalScore: "desc" }, { updatedAt: "desc" }],
        take: 100,
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.optimizationRecommendation.findFirst({
        orderBy: { createdAt: "desc" },
      }),
      prisma.publication.findMany({
        where: { status: "published" },
        orderBy: { publishedAt: "desc" },
        take: 20,
        include: { topicCandidate: true },
      }),
      prisma.workflowStepRun.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 100,
      }),
    ]);

    return { topics, recentAuditLogs, latestOptimization, latestPublished, recentStepRuns };
  } catch {
    return null;
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const config = getConfig();
  const persisted = await getPersistedOperationalData();

  if (persisted && persisted.topics.length > 0) {
    const topTopic = persisted.topics[0]!;
    const latestBriefJson = topTopic.briefs[0]?.briefJson as ContentBrief | undefined;
    const latestDraftJson = topTopic.drafts[0]?.draftJson as Draft | undefined;
    const latestApproval = topTopic.drafts[0]?.approvals[0];
    const auditByAgent = new Map<string, (typeof persisted.recentAuditLogs)[number]>();
    for (const event of persisted.recentAuditLogs) {
      const [agent] = event.action.split(":");
      if (agent && !auditByAgent.has(agent)) {
        auditByAgent.set(agent, event);
      }
    }
    const stepToAgent: Record<string, DashboardData["agentControlRows"][number]["name"]> = {
      discovery: "keyword_discovery",
      prioritization: "topic_prioritization",
      brief: "content_brief_outline",
      draft: "article_drafting",
      qa: "editorial_qa",
      publish: "publishing_strapi",
    };
    const stepStatusToAgentStatus: Record<string, string> = {
      not_started: "idle",
      running: "running",
      completed: "completed",
      failed: "failed",
      needs_review: "needs_review",
      approved: "approved",
    };
    const latestStepByAgent = new Map<string, (typeof persisted.recentStepRuns)[number]>();
    for (const stepRun of persisted.recentStepRuns) {
      const agentName = stepToAgent[stepRun.stepName];
      if (agentName && !latestStepByAgent.has(agentName)) {
        latestStepByAgent.set(agentName, stepRun);
      }
    }

    const persistedTopics: DashboardTopicSummary[] = persisted.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      workflowState: topic.workflowState,
      rationale: topic.rationale,
      totalScore: topic.totalScore,
      recommendation: topic.recommendation,
      cannibalizationRisk: topic.cannibalizationRisk,
      topicType: topic.topicType as DashboardTopicSummary["topicType"],
      drafts: topic.drafts.map((draft) => {
        const draftJson = draft.draftJson as Record<string, unknown>;
        const latestDraftApproval = draft.approvals[0];

        return {
          id: draft.id,
          ...(typeof draftJson.reviewDocUrl === "string" ? { reviewDocUrl: draftJson.reviewDocUrl } : {}),
          ...(typeof draftJson.reviewDocProvider === "string" ? { reviewDocProvider: draftJson.reviewDocProvider } : {}),
          ...(latestDraftApproval ? { approvalDecision: latestDraftApproval.decision } : {}),
          ...(latestDraftApproval?.notes ? { approvalNotes: latestDraftApproval.notes } : {}),
        };
      }),
      publications: topic.publications.map((publication) => ({
        id: publication.id,
        slug: publication.slug,
        status: publication.status,
        title: topic.title,
        ...(publication.publishedAt ? { publishedAt: publication.publishedAt.toISOString() } : {}),
        metricSnapshots: publication.metricSnapshots.map((snapshot) => ({
          id: snapshot.id,
          capturedAt: snapshot.capturedAt.toISOString(),
          impressions: snapshot.impressions,
          clicks: snapshot.clicks,
          ctr: snapshot.ctr,
          averagePosition: snapshot.averagePosition,
          conversions: snapshot.conversions,
        })),
        optimizationTasks: publication.optimizationTasks.map((task) => ({
          id: task.id,
          type: task.type,
          priority: task.priority,
          reason: task.reason,
          actions:
            typeof task.recommendationJson === "object" &&
            task.recommendationJson &&
            "actions" in (task.recommendationJson as Record<string, unknown>) &&
            Array.isArray((task.recommendationJson as Record<string, unknown>).actions)
              ? ((task.recommendationJson as Record<string, unknown>).actions as string[])
              : [],
          createdAt: task.createdAt.toISOString(),
        })),
      })),
    }));

    const publishedInventory: DashboardPublicationSummary[] = persisted.latestPublished.map((publication) => ({
      id: publication.id,
      slug: publication.slug,
      status: publication.status,
      title: publication.topicCandidate.title,
      ...(publication.publishedAt ? { publishedAt: publication.publishedAt.toISOString() } : {}),
      metricSnapshots: [],
      optimizationTasks: [],
    }));

    const optimizationTask =
      persisted.latestOptimization
        ? {
            type: persisted.latestOptimization.type,
            priority: persisted.latestOptimization.priority,
            reason: persisted.latestOptimization.reason,
            actions:
              typeof persisted.latestOptimization.recommendationJson === "object" &&
              persisted.latestOptimization.recommendationJson &&
              "actions" in (persisted.latestOptimization.recommendationJson as Record<string, unknown>) &&
              Array.isArray((persisted.latestOptimization.recommendationJson as Record<string, unknown>).actions)
                ? ((persisted.latestOptimization.recommendationJson as Record<string, unknown>).actions as string[])
                : [],
          }
        : {
            type: mockOptimizationTask.type,
            priority: mockOptimizationTask.priority,
            reason: mockOptimizationTask.reason,
            actions: mockOptimizationTask.actions,
        };

    const performanceActions = buildPerformanceActions(persistedTopics);

    return {
      prioritized: persistedTopics.map((topic) => ({
        keyword: topic.title,
        totalScore: topic.totalScore,
        explanation: topic.rationale,
        recommendation: topic.recommendation,
        cannibalizationRisk: topic.cannibalizationRisk,
        topicType: topic.topicType,
        breakdown:
          ((persisted.topics.find((persistedTopic) => persistedTopic.id === topic.id)?.scoreBreakdownJson as Record<string, number> | undefined) ??
            {}),
      })),
      queuedTopics: persistedTopics.map((topic) => ({
        keyword: topic.title,
        explanation: topic.rationale,
      })),
      brief: latestBriefJson ?? mockBrief,
      draft: latestDraftJson ?? mockDraft,
      qa: {
        passed: topTopic.workflowState !== "revision_requested",
        flags: latestApproval?.notes ? [latestApproval.notes] : [],
        requiresHumanReview: true,
        normalizedDraft: latestDraftJson ?? mockDraft,
      },
      optimizationTask,
      workflowRun: {
        id: `workflow_${topTopic.id}`,
        orchestrator: "WorkflowOrchestrator",
        state: topTopic.workflowState,
        approvalRequired: true,
        currentTopic: topTopic.title,
      },
      automationStatus: {
        discoveryCron: config.DISCOVERY_CRON,
        monitoringCron: config.MONITORING_CRON,
        refreshCron: config.REFRESH_CRON,
      },
      integrations: [
        { name: "Google Search Console", status: config.GSC_CLIENT_EMAIL ? "configured" : "missing credentials" },
        { name: "Google Analytics 4", status: config.GA4_PROPERTY_ID ? "configured" : "missing property id" },
        { name: "Google Docs Review", status: config.GOOGLE_DOCS_REVIEW_ENABLED ? "enabled" : "disabled" },
        { name: "Strapi", status: config.STRAPI_API_TOKEN ? "configured" : "missing token" },
        { name: "OpenAI Drafting", status: config.OPENAI_API_KEY ? "configured" : "missing api key" },
      ],
      agentControlRows: defaultAgentControlRows().map((row) => {
        const latestStep = latestStepByAgent.get(row.name);
        const latest = auditByAgent.get(row.name);
        return {
          ...row,
          latestStatus: latestStep
            ? (stepStatusToAgentStatus[latestStep.status] ?? latestStep.status)
            : latest
              ? latest.action.split(":")[1] ?? "completed"
              : row.latestStatus,
          latestRunAt: latestStep
            ? (latestStep.completedAt ?? latestStep.startedAt ?? latestStep.createdAt).toISOString()
            : latest
              ? latest.createdAt.toISOString()
              : row.latestRunAt,
        };
      }),
      orchestratorTimeline: persisted.recentAuditLogs
        .slice()
        .reverse()
        .map((event) => {
          const [agent, state = event.action] = event.action.split(":");
          return {
            at: event.createdAt.toISOString(),
            state,
            agent: agent ?? "system",
            summary: `${event.entityType} ${event.entityId}`,
          };
        }),
      agentNames,
      publishedInventory,
      persistedTopics,
      performanceActions,
    };
  }

  const mockPersistedTopics: DashboardTopicSummary[] = [];
  const performanceActions = buildPerformanceActions(mockPersistedTopics);

  return {
    prioritized: mockTopicCandidates.map((topic) => ({
      keyword: topic.keyword,
      totalScore: 78,
      explanation: topic.explanation,
      recommendation: topic.recommendation,
      cannibalizationRisk: 12,
      topicType: "new_article" as const,
      breakdown: {
        volumeScore: 70,
        difficultyInverseScore: 68,
        trendScore: 66,
        businessRelevanceScore: 90,
        conversionIntentScore: 84,
        competitorGapScore: 65,
        freshnessScore: 58,
        clusterValueScore: 76,
        authorityFitScore: 88,
      },
    })),
    queuedTopics: mockTopicCandidates,
    brief: mockBrief,
    draft: mockDraft,
    qa: {
      passed: true,
      flags: [],
      requiresHumanReview: true,
      normalizedDraft: mockDraft,
    },
    optimizationTask: {
      type: mockOptimizationTask.type,
      priority: mockOptimizationTask.priority,
      reason: mockOptimizationTask.reason,
      actions: mockOptimizationTask.actions,
    },
    workflowRun: {
      id: "workflow_run_mock_001",
      orchestrator: "WorkflowOrchestrator",
      state: "in_review",
      approvalRequired: true,
      currentTopic: mockBrief.primaryKeyword,
    },
    automationStatus: {
      discoveryCron: config.DISCOVERY_CRON,
      monitoringCron: config.MONITORING_CRON,
      refreshCron: config.REFRESH_CRON,
    },
    integrations: [
      { name: "Google Search Console", status: config.GSC_CLIENT_EMAIL ? "configured" : "missing credentials" },
      { name: "Google Analytics 4", status: config.GA4_PROPERTY_ID ? "configured" : "missing property id" },
      { name: "Google Docs Review", status: config.GOOGLE_DOCS_REVIEW_ENABLED ? "enabled" : "disabled" },
      { name: "Strapi", status: config.STRAPI_API_TOKEN ? "configured" : "missing token" },
      { name: "OpenAI Drafting", status: config.OPENAI_API_KEY ? "configured" : "missing api key" },
    ],
    agentControlRows: [...defaultAgentControlRows()],
    orchestratorTimeline: [],
    agentNames,
    publishedInventory: [],
    persistedTopics: mockPersistedTopics,
    performanceActions,
  };
}

function buildGridRow(args: {
  pillar: string;
  theme: string;
  primaryKeyword: string;
  searchVolume: string;
  contentType: string;
  publishStatus?: "waiting" | "published";
  reviewPackage?: WorkflowGridRow["reviewPackage"];
}): WorkflowGridRow {
  const published = args.publishStatus === "published";
  const normalizedId = args.primaryKeyword.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  return {
    id: `grid_${normalizedId}`,
    pillar: args.pillar,
    theme: args.theme,
    primaryKeyword: args.primaryKeyword,
    searchVolume: args.searchVolume,
    contentType: args.contentType,
    ...(args.reviewPackage ? { reviewPackage: args.reviewPackage } : {}),
    cells: [
      {
        step: "keyword_discovery",
        status: "success",
        label: "Keyword intel",
        detail: `Pulled discovery signals for ${args.primaryKeyword}.`,
      },
      {
        step: "topic_prioritization",
        status: "success",
        label: "Scored",
        detail: `Ranked against business fit and cannibalization risk.`,
      },
      {
        step: "content_brief_outline",
        status: "success",
        label: "Outline ready",
        detail: "Title options, H2/H3 structure, FAQs, and internal links generated.",
      },
      {
        step: "article_drafting",
        status: "success",
        label: "Draft ready",
        detail: "Article draft, slug, title tag, and meta description prepared.",
      },
      {
        step: "editorial_qa",
        status: "review_needed",
        label: "Human review",
        detail: "QA complete. Waiting for editor approval before publish.",
      },
      {
        step: "publishing_strapi",
        status: published ? "published" : "waiting",
        label: published ? "Published to Strapi" : "Blocked",
        detail: published
          ? "Entry created and published in Strapi."
          : "Publish agent is held until approval is recorded.",
      },
      {
        step: "performance_monitoring_refresh",
        status: published ? "success" : "pending",
        label: published ? "Monitoring live" : "Not started",
        detail: published
          ? "Tracking CTR, rankings, and refresh opportunities."
          : "Monitoring begins after publish.",
      },
    ],
  };
}

function createMockReviewPackage(primaryKeyword: string): NonNullable<WorkflowGridRow["reviewPackage"]> {
  const slug = primaryKeyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    draftId: `${mockDraft.id}_${slug}`,
    topicRationale:
      "This topic aligns with high-intent prepared-meal discovery and supports CookUnity's chef-driven positioning.",
    targetKeywords: [primaryKeyword, `${primaryKeyword} guide`, `best ${primaryKeyword}`],
    titleTag: mockDraft.titleTagOptions[0] ?? `${primaryKeyword} | CookUnity`,
    metaDescription:
      mockDraft.metaDescriptionOptions[0] ??
      `Learn what to look for in ${primaryKeyword} and how CookUnity compares.`,
    internalLinks: mockBrief.recommendedInternalLinks.map((link) => link.anchorText),
    schema: mockDraft.schemaSuggestions,
    slug,
    h1: primaryKeyword.replace(/\b\w/g, (character) => character.toUpperCase()),
    intro: mockDraft.intro,
    sections: mockDraft.sections,
    faq: mockDraft.faq,
    ctaSuggestions: mockDraft.ctaSuggestions,
    editorNotes: mockDraft.editorNotes,
    html: mockDraft.html,
    reviewDocUrl: `https://docs.mock.local/document/d/${slug}`,
    reviewDocProvider: "mock",
  };
}

export function buildReviewPackageFromRecords(args: {
  draft: Draft;
  brief?: ContentBrief;
  topicRationale?: string | null;
}): NonNullable<WorkflowGridRow["reviewPackage"]> {
  return {
    draftId: args.draft.id,
    topicRationale: args.topicRationale ?? "Awaiting scored topic rationale.",
    targetKeywords: args.draft.targetKeywords,
    titleTag: args.draft.titleTagOptions[0] ?? args.draft.h1,
    metaDescription: args.draft.metaDescriptionOptions[0] ?? "",
    internalLinks: args.brief?.recommendedInternalLinks.map((link) => link.anchorText) ?? [],
    schema: args.draft.schemaSuggestions,
    slug: args.draft.slugRecommendation,
    h1: args.draft.h1,
    intro: args.draft.intro,
    sections: args.draft.sections,
    faq: args.draft.faq,
    ctaSuggestions: args.draft.ctaSuggestions,
    editorNotes: args.draft.editorNotes,
    html: args.draft.html,
    ...(typeof args.draft === "object" &&
    args.draft &&
    "reviewDocUrl" in (args.draft as Record<string, unknown>) &&
    typeof (args.draft as Record<string, unknown>).reviewDocUrl === "string"
      ? { reviewDocUrl: String((args.draft as Record<string, unknown>).reviewDocUrl) }
      : {}),
    ...(typeof args.draft === "object" &&
    args.draft &&
    "reviewDocProvider" in (args.draft as Record<string, unknown>) &&
    typeof (args.draft as Record<string, unknown>).reviewDocProvider === "string"
      ? { reviewDocProvider: String((args.draft as Record<string, unknown>).reviewDocProvider) }
      : {}),
  };
}

export async function getWorkflowGridData(keyword?: string) {
  const databaseReady = await isDatabaseReady();
  const persistedRows = databaseReady ? await safeListWorkflowGridRows() : null;
  if (persistedRows && persistedRows.length > 0 && !keyword?.trim()) {
    return {
      rows: persistedRows,
      columns: [
        { id: "keyword_discovery", label: "0. Keyword Discovery" },
        { id: "topic_prioritization", label: "1. Prioritize" },
        { id: "content_brief_outline", label: "2. Brief / Outline" },
        { id: "article_drafting", label: "3. Draft Article" },
        { id: "editorial_qa", label: "4. QA / Review" },
        { id: "publishing_strapi", label: "5. Push to Strapi" },
        { id: "performance_monitoring_refresh", label: "6. Monitor / Refresh" },
      ],
      persistenceMode: "database" as const,
      databaseReady,
    };
  }

  const rows: WorkflowGridRow[] = [
    buildGridRow({
      pillar: "Mexican",
      theme: "Mexican",
      primaryKeyword: "Mexican cuisine",
      searchVolume: "22200",
      contentType: "Guide",
      publishStatus: "published",
      reviewPackage: createMockReviewPackage("Mexican cuisine"),
    }),
    buildGridRow({
      pillar: "Mexican",
      theme: "Mexican",
      primaryKeyword: "Mexican chefs",
      searchVolume: "",
      contentType: "Guide",
      publishStatus: "waiting",
      reviewPackage: createMockReviewPackage("Mexican chefs"),
    }),
    buildGridRow({
      pillar: "Mexican",
      theme: "Mexican",
      primaryKeyword: "mexican foods",
      searchVolume: "",
      contentType: "Guide",
      publishStatus: "waiting",
      reviewPackage: createMockReviewPackage("mexican foods"),
    }),
  ];

  const cleanedKeyword = keyword?.trim();
  if (cleanedKeyword) {
    rows.unshift(
      buildGridRow({
        pillar: "Custom",
        theme: "Custom",
        primaryKeyword: cleanedKeyword,
        searchVolume: "TBD",
        contentType: "Guide",
        publishStatus: "waiting",
        reviewPackage: createMockReviewPackage(cleanedKeyword),
      }),
    );
  }

  return {
    rows,
    columns: [
      { id: "keyword_discovery", label: "0. Keyword Discovery" },
      { id: "topic_prioritization", label: "1. Prioritize" },
      { id: "content_brief_outline", label: "2. Brief / Outline" },
      { id: "article_drafting", label: "3. Draft Article" },
      { id: "editorial_qa", label: "4. QA / Review" },
      { id: "publishing_strapi", label: "5. Push to Strapi" },
      { id: "performance_monitoring_refresh", label: "6. Monitor / Refresh" },
    ],
    persistenceMode: "mock" as const,
    databaseReady,
  };
}
