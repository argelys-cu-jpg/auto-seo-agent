import { AutonomousSeoAgent } from "@cookunity-seo-agent/core";
import {
  agentNames,
  mockBrief,
  mockDraft,
  mockOptimizationTask,
  mockTopicCandidates,
  type ContentBrief,
  type Draft,
} from "@cookunity-seo-agent/shared";
import { safeListWorkflowGridRows } from "./workflow-grid-store";
import { isDatabaseReady } from "./runtime";

const agent = new AutonomousSeoAgent();

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
  };
}

export async function getDashboardData() {
  const prioritized = await agent.runDiscovery(
    ["prepared meals", "healthy meal delivery", "chef-crafted meals"],
    [
      {
        id: "pub_meal_delivery_basics",
        title: "What Is Prepared Meal Delivery?",
        primaryKeyword: "prepared meal delivery",
        secondaryKeywords: ["meal delivery explained", "prepared meals"],
        cluster: "prepared meal delivery",
      },
    ],
  );
  const draftPipeline = await agent.runDraftPipeline();
  const monitorTasks = await agent.runMonitoring([
    "https://www.cookunity.com/blog/healthy-prepared-meal-delivery-guide",
  ]);

  const workflowRun = {
    id: "workflow_run_mock_001",
    orchestrator: "WorkflowOrchestrator",
    state: "in_review",
    approvalRequired: true,
    currentTopic: draftPipeline.brief.primaryKeyword,
  };

  const agentControlRows = [
    {
      name: "keyword_discovery",
      responsibility: "Collect keyword opportunities from Ahrefs, GSC, Trends, and SERP-style discovery.",
      inputContract: "KeywordDiscoveryInput",
      outputContract: "KeywordDiscoveryOutput",
      latestStatus: "completed",
      latestRunAt: "2026-04-14T10:00:00.000Z",
      retrySafe: true,
      promptIsolation: "keyword_cluster:v1",
    },
    {
      name: "topic_prioritization",
      responsibility: "Score, rank, and classify candidate topics with cannibalization-aware logic.",
      inputContract: "TopicPrioritizationInput",
      outputContract: "TopicPrioritizationOutput",
      latestStatus: "completed",
      latestRunAt: "2026-04-14T10:01:00.000Z",
      retrySafe: true,
      promptIsolation: "topic_scoring:v1",
    },
    {
      name: "content_brief_outline",
      responsibility: "Generate SEO brief, title options, outline, FAQs, schema draft, and CTA recommendations.",
      inputContract: "ContentBriefAgentInput",
      outputContract: "ContentBriefAgentOutput",
      latestStatus: "completed",
      latestRunAt: "2026-04-14T10:03:00.000Z",
      retrySafe: true,
      promptIsolation: "outline_generation:v1",
    },
    {
      name: "article_drafting",
      responsibility: "Generate article draft package with metadata, sections, HTML, and editorial checklist.",
      inputContract: "ArticleDraftingInput",
      outputContract: "ArticleDraftingOutput",
      latestStatus: "completed",
      latestRunAt: "2026-04-14T10:05:00.000Z",
      retrySafe: true,
      promptIsolation: "article_draft:v1",
    },
    {
      name: "editorial_qa",
      responsibility: "Apply brand, quality, banned-phrase, and YMYL-adjacent checks before human review.",
      inputContract: "EditorialQaInput",
      outputContract: "EditorialQaOutput",
      latestStatus: draftPipeline.qa.passed ? "completed" : "flagged",
      latestRunAt: "2026-04-14T10:06:00.000Z",
      retrySafe: true,
      promptIsolation: "editorial_qa:v1",
    },
    {
      name: "publishing_strapi",
      responsibility: "Create/update/publish Strapi entries only after orchestrator approval.",
      inputContract: "PublishingAgentInput",
      outputContract: "PublishingAgentOutput",
      latestStatus: "waiting_for_approval",
      latestRunAt: "2026-04-14T10:07:00.000Z",
      retrySafe: true,
      promptIsolation: "publishing_strapi:v1",
    },
    {
      name: "performance_monitoring_refresh",
      responsibility: "Monitor post-publish performance and create refresh tasks for the orchestrator.",
      inputContract: "PerformanceMonitoringInput",
      outputContract: "PerformanceMonitoringOutput",
      latestStatus: monitorTasks.length > 0 ? "completed_with_recommendations" : "completed",
      latestRunAt: "2026-04-14T10:08:00.000Z",
      retrySafe: true,
      promptIsolation: "refresh_draft:v1",
    },
  ] as const;

  const orchestratorTimeline = [
    {
      at: "2026-04-14T10:00:00.000Z",
      state: "discovered",
      agent: "keyword_discovery",
      summary: `Collected ${prioritized.length} candidate opportunities.`,
    },
    {
      at: "2026-04-14T10:01:00.000Z",
      state: "scored",
      agent: "topic_prioritization",
      summary: `Top recommendation: ${prioritized[0]?.keyword ?? "n/a"}.`,
    },
    {
      at: "2026-04-14T10:03:00.000Z",
      state: "outline_generated",
      agent: "content_brief_outline",
      summary: `Brief created for ${draftPipeline.brief.primaryKeyword}.`,
    },
    {
      at: "2026-04-14T10:05:00.000Z",
      state: "draft_generated",
      agent: "article_drafting",
      summary: `Draft ${draftPipeline.draft.id} generated with ${draftPipeline.draft.sections.length} sections.`,
    },
    {
      at: "2026-04-14T10:06:00.000Z",
      state: "in_review",
      agent: "editorial_qa",
      summary: draftPipeline.qa.flags.length
        ? `QA flagged ${draftPipeline.qa.flags.length} issue(s).`
        : "QA passed, but human review remains required.",
    },
  ];

  return {
    prioritized,
    queuedTopics: mockTopicCandidates,
    brief: draftPipeline.brief ?? mockBrief,
    draft: draftPipeline.draft ?? mockDraft,
    qa: draftPipeline.qa,
    optimizationTask: mockOptimizationTask,
    workflowRun,
    agentControlRows,
    orchestratorTimeline,
    agentNames,
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
