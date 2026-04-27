import type {
  ContentBrief,
  Draft,
  OpportunityPath,
  OpportunityType,
  RowStatus,
  WorkflowStepName,
  WorkflowStepStatus,
} from "@cookunity-seo-agent/shared";
import { getConfig, mockBrief, mockDraft } from "@cookunity-seo-agent/shared";
import { unstable_noStore as noStore } from "next/cache";

function toJsonValue(value: unknown) {
  return value as Record<string, unknown> | null;
}

async function getPrismaClient() {
  const dbModule = await import("@cookunity-seo-agent/db");
  const prisma = dbModule.prisma;
  await prisma.$connect();
  return prisma;
}

const orderedSteps: WorkflowStepName[] = ["discovery", "prioritization", "brief", "draft", "qa", "publish"];

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

function keywordToSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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

async function recordAudit(
  prisma: Awaited<ReturnType<typeof getPrismaClient>>,
  entityType: string,
  entityId: string,
  action: string,
  actorType: string,
  payload: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      actorType,
      payload: payload as never,
    },
  });
}

async function ensureWorkflowRun(
  prisma: Awaited<ReturnType<typeof getPrismaClient>>,
  opportunityId: string,
) {
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
      trigger: "web_grid_materialize",
      status: "idle",
    },
  });
}

function buildFallbackBrief(opportunity: {
  id: string;
  keyword: string;
  path: OpportunityPath;
  intent: string;
}): ContentBrief {
  const secondaryKeywords = buildFallbackSecondaryKeywords(opportunity.keyword);
  return {
    ...mockBrief,
    id: `brief_${opportunity.id}`,
    topicId: opportunity.id,
    primaryKeyword: opportunity.keyword,
    secondaryKeywords,
    titleOptions: [
      opportunity.keyword.replace(/\b\w/g, (character) => character.toUpperCase()),
      `${opportunity.keyword.replace(/\b\w/g, (character) => character.toUpperCase())} guide`,
      `How to choose ${opportunity.keyword}`,
    ],
    intentSummary:
      opportunity.path === "blog"
        ? "Capture-first fallback brief generated directly in the web app."
        : "Trial-first fallback brief generated directly in the web app.",
    ctaRecommendations:
      opportunity.path === "blog"
        ? ["Get menu updates by email", "Download the comparison guide"]
        : ["Start your trial", "See this week's menu"],
    briefJson: {
      ...(mockBrief.briefJson as Record<string, unknown>),
      path: opportunity.path,
      intent: opportunity.intent,
      successMetric: opportunity.path === "blog" ? "capture_rate" : "checkout_cvr",
      workflowLabel: opportunity.path === "blog" ? "Blog → email capture → nurture → trial" : "Landing pages → direct trial",
      generatedBy: "web_fallback",
    },
  };
}

function buildFallbackDraft(opportunity: {
  id: string;
  keyword: string;
  path: OpportunityPath;
}): Draft {
  const title = opportunity.keyword.replace(/\b\w/g, (character) => character.toUpperCase());
  const slug = keywordToSlug(opportunity.keyword);
  const secondaryKeywords = buildFallbackSecondaryKeywords(opportunity.keyword);
  const keyTakeaways = [
    `Answer the core ${opportunity.keyword} query directly before branching into supporting context.`,
    `Use secondary support terms like ${secondaryKeywords.slice(0, 3).join(", ")} where they deepen the article naturally.`,
    opportunity.path === "blog"
      ? "Close with a practical bridge into menu exploration or capture."
      : "Close with a direct, low-friction path into trial.",
  ];
  const intro =
    opportunity.path === "blog"
      ? `${title} helps readers understand the topic quickly, then builds out the answer with supporting subtopics so the page feels complete instead of thin.`
      : `${title} helps high-intent readers compare options clearly, understand the strongest decision criteria, and see how CookUnity fits the category.`;
  const sections = buildFallbackDraftSections(opportunity.keyword, opportunity.path, secondaryKeywords);
  const faq = [
    {
      question: `What should an article about ${opportunity.keyword} prioritize first?`,
      answer: `It should answer the main query directly, then support the article with related angles like ${secondaryKeywords.slice(0, 2).join(" and ")} so the reader gets a fuller, more useful answer.`,
    },
    {
      question: `How should secondary keywords show up in ${opportunity.keyword} content?`,
      answer: `They should be woven into sections that genuinely expand the article, not dumped into one paragraph. Terms like ${secondaryKeywords.slice(0, 3).join(", ")} should help structure the supporting sections.`,
    },
  ];
  const html = [
    "<article>",
    `<h1>${title}</h1>`,
    `<p>${intro}</p>`,
    "<h2>Key takeaways</h2>",
    "<ul>",
    ...keyTakeaways.map((item) => `<li>${item}</li>`),
    "</ul>",
    ...sections.map((section) => `<h2>${section.heading}</h2><p>${section.body}</p>`),
    "<h2>Frequently Asked Questions</h2>",
    ...faq.map((item) => `<h3>${item.question}</h3><p>${item.answer}</p>`),
    "</article>",
  ].join("");

  return {
    ...mockDraft,
    id: `draft_${opportunity.id}`,
    topicId: opportunity.id,
    briefId: `brief_${opportunity.id}`,
    slugRecommendation: slug,
    h1: title,
    intro,
    keyTakeaways,
    sections,
    faq,
    html,
    titleTagOptions: [`${title} | CookUnity`],
    metaDescriptionOptions: [
      opportunity.path === "blog"
        ? `Fallback draft for ${opportunity.keyword}. Review and refine for capture.`
        : `Fallback draft for ${opportunity.keyword}. Review and refine for direct trial conversion.`,
    ],
    ctaSuggestions:
      opportunity.path === "blog"
        ? ["Get menu updates by email", "Download the comparison guide"]
        : ["Start your trial", "See this week's menu"],
    editorNotes: [
      ...(mockDraft.editorNotes ?? []),
      "Generated by the direct web fallback workflow.",
      `Secondary keywords supported in the article body: ${secondaryKeywords.join(", ")}.`,
    ],
    targetKeywords: [opportunity.keyword, ...secondaryKeywords],
  };
}

function buildFallbackSecondaryKeywords(keyword: string) {
  const cleaned = keyword.replace(/\s+/g, " ").trim();
  return [
    `${cleaned} guide`,
    `${cleaned} ideas`,
    `best ${cleaned}`,
    `${cleaned} tips`,
    `how to choose ${cleaned}`,
  ].filter((value, index, all) => value && all.indexOf(value) === index).slice(0, 5);
}

function buildFallbackDraftSections(keyword: string, path: OpportunityPath, secondaryKeywords: string[]) {
  const [secondaryA, secondaryB, secondaryC, secondaryD] = secondaryKeywords;
  const directTrial = path === "landing_page";
  return [
    {
      heading: `What readers are trying to solve when they search ${keyword}`,
      level: 2,
      body: `Readers usually arrive here with a practical problem, not abstract curiosity. They want a direct answer about ${keyword}, but they also want the article to support adjacent intent like ${secondaryA} and ${secondaryB} so they do not have to keep searching for the basics the page should have covered already.`,
    },
    {
      heading: `How to frame ${keyword} so the article feels complete`,
      level: 2,
      body: directTrial
        ? `Conversion-oriented content works best when it moves from explanation into comparison quickly. Supporting angles like ${secondaryC} help answer the real decision questions around quality, flexibility, and fit rather than stopping at vague category language.`
        : `Editorial content works best when it moves from explanation into practical guidance. Supporting angles like ${secondaryC} make the article richer because they expand the answer instead of repeating the main keyword in different words.`,
    },
    {
      heading: "Which supporting sections earn their place",
      level: 2,
      body: `A stronger article gives the secondary keywords real jobs. ${secondaryA} can help shape one section, ${secondaryB} can support a comparison or examples section, and ${secondaryD} can reinforce the close or FAQ. That approach makes the page denser and more useful without sounding engineered.`,
    },
    {
      heading: "How CookUnity should enter the conversation",
      level: 2,
      body: directTrial
        ? `CookUnity is strongest as the practical answer once the decision criteria are clear. The page can connect chef quality, menu breadth, and ease in a way that feels specific to the category rather than bolted on as a generic CTA.`
        : `CookUnity works best as proof that the topic can be made practical. Connecting the guidance back to real meals and real routines is what separates useful editorial copy from thin SEO filler.`,
    },
    {
      heading: "What the conclusion needs to reinforce",
      level: 2,
      body: `Before the article closes, the reader should be reminded what matters most about ${keyword}, with the strongest supporting subtopics pulled back into the summary. If the page has used ${secondaryA} and ${secondaryB} well, the conclusion will feel earned rather than abrupt.`,
    },
    {
      heading: "Bottom line",
      level: 2,
      body: directTrial
        ? `A strong ${keyword} draft reduces uncertainty, covers the key supporting terms naturally, and gives the reader a confident next step toward trial.`
        : `A strong ${keyword} draft answers the primary query clearly, builds out the answer with the right supporting keywords, and leaves the reader with a more useful decision framework than they had before they arrived.`,
    },
  ];
}

async function materializeFallbackWorkflow(opportunityId: string, targetStep?: WorkflowStepName) {
  const prisma = await getPrismaClient();
  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) {
    throw new Error(`Opportunity not found: ${opportunityId}`);
  }

  const workflowRun = await ensureWorkflowRun(prisma, opportunityId);
  const stepsToRun = targetStep
    ? orderedSteps.slice(0, orderedSteps.indexOf(targetStep) + 1)
    : orderedSteps.slice(0, orderedSteps.indexOf("publish"));

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { rowStatus: "running", lastError: null },
  });
  await prisma.workflowRun.update({
    where: { id: workflowRun.id },
    data: { status: "running" },
  });

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
      workflowState: "queued",
      recommendation: opportunity.path === "landing_page" ? "write_now" : "monitor",
      totalScore: opportunity.path === "landing_page" ? 82 : 74,
      scoreBreakdownJson: {
        volumeScore: 62,
        difficultyInverseScore: 68,
        trendScore: 58,
        businessRelevanceScore: opportunity.path === "landing_page" ? 92 : 76,
        conversionIntentScore: opportunity.path === "landing_page" ? 90 : 62,
        competitorGapScore: 64,
        freshnessScore: 55,
        clusterValueScore: 72,
        authorityFitScore: 81,
      } as never,
      rationale: "Direct web fallback workflow materialized this opportunity.",
      cannibalizationRisk: 18,
      topicType: opportunity.path === "landing_page" ? "support_cluster" : "new_article",
    },
    create: {
      title: opportunity.keyword,
      normalizedKeyword: opportunity.normalizedKeyword,
      keywordId: keyword.id,
      source: "manual",
      workflowState: "queued",
      recommendation: opportunity.path === "landing_page" ? "write_now" : "monitor",
      totalScore: opportunity.path === "landing_page" ? 82 : 74,
      scoreBreakdownJson: {
        volumeScore: 62,
        difficultyInverseScore: 68,
        trendScore: 58,
        businessRelevanceScore: opportunity.path === "landing_page" ? 92 : 76,
        conversionIntentScore: opportunity.path === "landing_page" ? 90 : 62,
        competitorGapScore: 64,
        freshnessScore: 55,
        clusterValueScore: 72,
        authorityFitScore: 81,
      } as never,
      rationale: "Direct web fallback workflow materialized this opportunity.",
      topicType: opportunity.path === "landing_page" ? "support_cluster" : "new_article",
    },
  });

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      topicCandidateId: topicCandidate.id,
      intent: inferIntent(opportunity.keyword, opportunity.path),
    },
  });

  const baseOutputs: Partial<Record<WorkflowStepName, Record<string, unknown>>> = {
    discovery: {
      keyword: opportunity.keyword,
      path: opportunity.path,
      intent: inferIntent(opportunity.keyword, opportunity.path),
      candidates: [
        {
          keyword: opportunity.keyword,
          source: "manual",
          searchVolume: 1200,
          keywordDifficulty: 24,
          trendVelocity: 8,
          intent: inferIntent(opportunity.keyword, opportunity.path),
        },
      ],
      matchedCandidate: {
        keyword: opportunity.keyword,
        source: "manual",
        searchVolume: 1200,
        keywordDifficulty: 24,
        trendVelocity: 8,
        intent: inferIntent(opportunity.keyword, opportunity.path),
      },
    },
    prioritization: {
      keyword: opportunity.keyword,
      totalScore: opportunity.path === "landing_page" ? 82 : 74,
      recommendation: opportunity.path === "landing_page" ? "write_now" : "monitor",
      topicType: opportunity.path === "landing_page" ? "support_cluster" : "new_article",
      explanation: "Direct web fallback prioritization.",
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
      intent: inferIntent(opportunity.keyword, opportunity.path),
    },
  };

  let briefRecordId: string | null = null;
  let draftRecordId: string | null = null;

  for (const stepName of stepsToRun) {
    if (stepName === "publish") {
      break;
    }

    const previousCount = await prisma.workflowStepRun.count({
      where: { workflowRunId: workflowRun.id, stepName },
    });

    const stepRun = await prisma.workflowStepRun.create({
      data: {
        opportunityId,
        workflowRunId: workflowRun.id,
        stepName,
        version: previousCount + 1,
        status: "running",
        startedAt: new Date(),
      },
    });

    let output: Record<string, unknown>;
    let status: WorkflowStepStatus = "completed";
    let artifactType: string | null = null;
    let artifactId: string | null = null;

    if (stepName === "brief") {
      const brief = buildFallbackBrief({
        id: topicCandidate.id,
        keyword: opportunity.keyword,
        path: opportunity.path,
        intent: inferIntent(opportunity.keyword, opportunity.path),
      });
      const briefRecord = await prisma.contentBrief.create({
        data: {
          topicCandidateId: topicCandidate.id,
          promptVersionId: "web_fallback",
          primaryKeyword: brief.primaryKeyword,
          secondaryKeywordsJson: brief.secondaryKeywords as never,
          briefJson: brief as never,
        },
      });
      await prisma.outline.create({
        data: {
          topicCandidateId: topicCandidate.id,
          promptVersionId: "web_fallback",
          outlineJson: brief.briefJson as never,
        },
      });
      await prisma.topicCandidate.update({
        where: { id: topicCandidate.id },
        data: { workflowState: "outline_generated" },
      });
      briefRecordId = briefRecord.id;
      artifactType = "ContentBrief";
      artifactId = briefRecord.id;
      output = {
        ...brief,
        artifactId: briefRecord.id,
        path: opportunity.path,
        reviewLabel: opportunity.path === "blog" ? "Capture-focused brief" : "Trial-focused LP brief",
      };
    } else if (stepName === "draft") {
      const briefId = briefRecordId ?? (await prisma.contentBrief.findFirst({
        where: { topicCandidateId: topicCandidate.id },
        orderBy: { createdAt: "desc" },
      }))?.id;
      const draft = buildFallbackDraft({
        id: topicCandidate.id,
        keyword: opportunity.keyword,
        path: opportunity.path,
      });
      const draftRecord = await prisma.draft.create({
        data: {
          topicCandidateId: topicCandidate.id,
          briefId: briefId ?? null,
          promptVersionId: "web_fallback",
          draftJson: draft as never,
          html: draft.html,
          markdown: JSON.stringify(draft.sections),
        },
      });
      await prisma.topicCandidate.update({
        where: { id: topicCandidate.id },
        data: { workflowState: "draft_generated" },
      });
      draftRecordId = draftRecord.id;
      artifactType = "Draft";
      artifactId = draftRecord.id;
      output = {
        ...draft,
        artifactId: draftRecord.id,
      };
    } else if (stepName === "qa") {
      const normalizedDraft = buildFallbackDraft({
        id: topicCandidate.id,
        keyword: opportunity.keyword,
        path: opportunity.path,
      });
      await prisma.topicCandidate.update({
        where: { id: topicCandidate.id },
        data: { workflowState: "in_review" },
      });
      output = {
        passed: true,
        flags: ["Direct web fallback QA."],
        requiresHumanReview: true,
        normalizedDraft,
        path: opportunity.path,
        reviewLabel:
          opportunity.path === "blog"
            ? "Review for email capture readiness"
            : "Review for trial conversion readiness",
      };
      status = "needs_review";
    } else {
      output = baseOutputs[stepName] ?? { message: `${stepName} completed.` };
      if (stepName === "discovery") {
        await prisma.topicCandidate.update({
          where: { id: topicCandidate.id },
          data: { workflowState: "discovered" },
        });
      }
      if (stepName === "prioritization") {
        await prisma.topicCandidate.update({
          where: { id: topicCandidate.id },
          data: { workflowState: "queued" },
        });
      }
    }

    await prisma.workflowStepRun.update({
      where: { id: stepRun.id },
      data: {
        status,
        completedAt: new Date(),
        outputJson: output as never,
        ...(artifactType ? { artifactType } : {}),
        ...(artifactId ? { artifactId } : {}),
      },
    });

    await recordAudit(prisma, "workflow_step_run", stepRun.id, `${stepName}:${status}`, "system", {
      opportunityId,
      workflowRunId: workflowRun.id,
      generatedBy: "web_fallback",
    });

    if (status === "needs_review") {
      await prisma.workflowRun.update({
        where: { id: workflowRun.id },
        data: { status: "needs_review", currentStep: stepName },
      });
      await prisma.opportunity.update({
        where: { id: opportunityId },
        data: { rowStatus: "needs_review" },
      });
      return;
    }
  }

  await prisma.workflowRun.update({
    where: { id: workflowRun.id },
    data: { status: "needs_review", currentStep: "qa" },
  });
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { rowStatus: "needs_review" },
  });
}

export async function createOpportunityRecordAndRunWorkflow(input: {
  keyword: string;
  path: OpportunityPath;
  type: OpportunityType;
  pageIdea?: string;
  competitorPageUrl?: string;
}) {
  const opportunity = await createOpportunityRecord(input);
  await materializeFallbackWorkflow(opportunity.id);
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
  const prisma = await getPrismaClient();
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
      rowStatus: "idle",
      lastError: null,
    },
    create: {
      keyword: input.keyword.trim(),
      normalizedKeyword,
      path: input.path,
      type: input.type,
      pageIdea: input.pageIdea?.trim() || null,
      competitorPageUrl: input.competitorPageUrl?.trim() || null,
      intent: inferIntent(input.keyword, input.path),
      rowStatus: "idle",
    },
  });
}

export async function updateOpportunityRecord(
  opportunityId: string,
  input: {
    keyword?: string;
    path?: OpportunityPath;
    type?: OpportunityType;
    pageIdea?: string | null;
    competitorPageUrl?: string | null;
  },
) {
  const prisma = await getPrismaClient();
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

export async function deleteOpportunityRecord(opportunityId: string) {
  const prisma = await getPrismaClient();
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: { id: true, topicCandidateId: true },
  });
  if (!opportunity) {
    throw new Error(`Opportunity not found: ${opportunityId}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({
      where: {
        OR: [
          { entityType: "opportunity", entityId: opportunityId },
          { payload: { path: ["opportunityId"], equals: opportunityId } },
        ],
      },
    });
    await tx.revisionNote.deleteMany({ where: { opportunityId } });
    await tx.publishResult.deleteMany({ where: { opportunityId } });
    await tx.workflowStepRun.deleteMany({ where: { opportunityId } });
    await tx.workflowRun.deleteMany({ where: { opportunityId } });
    await tx.opportunity.delete({ where: { id: opportunityId } });

    if (!opportunity.topicCandidateId) {
      return;
    }

    const remainingOpportunities = await tx.opportunity.count({
      where: { topicCandidateId: opportunity.topicCandidateId },
    });
    if (remainingOpportunities > 0) {
      return;
    }

    const candidate = await tx.topicCandidate.findUnique({
      where: { id: opportunity.topicCandidateId },
      select: {
        id: true,
        keywordId: true,
        drafts: { select: { id: true } },
        publications: { select: { id: true } },
      },
    });
    if (!candidate) {
      return;
    }

    const publicationIds = candidate.publications.map((item) => item.id);
    const draftIds = candidate.drafts.map((item) => item.id);

    if (publicationIds.length > 0) {
      await tx.metricSnapshot.deleteMany({ where: { publicationId: { in: publicationIds } } });
      await tx.publishResult.deleteMany({ where: { publicationId: { in: publicationIds } } });
    }
    await tx.optimizationRecommendation.deleteMany({
      where: {
        OR: [
          { topicCandidateId: candidate.id },
          ...(publicationIds.length > 0 ? [{ publicationId: { in: publicationIds } }] : []),
        ],
      },
    });
    await tx.publication.deleteMany({ where: { topicCandidateId: candidate.id } });
    await tx.approval.deleteMany({
      where: {
        OR: [
          { topicCandidateId: candidate.id },
          ...(draftIds.length > 0 ? [{ draftId: { in: draftIds } }] : []),
        ],
      },
    });
    await tx.draft.deleteMany({ where: { topicCandidateId: candidate.id } });
    await tx.outline.deleteMany({ where: { topicCandidateId: candidate.id } });
    await tx.contentBrief.deleteMany({ where: { topicCandidateId: candidate.id } });
    await tx.contentClusterMember.deleteMany({ where: { topicCandidateId: candidate.id } });
    await tx.topicCandidate.delete({ where: { id: candidate.id } });

    if (candidate.keywordId) {
      const remainingTopicCandidates = await tx.topicCandidate.count({
        where: { keywordId: candidate.keywordId },
      });
      if (remainingTopicCandidates === 0) {
        await tx.keyword.delete({ where: { id: candidate.keywordId } }).catch(() => undefined);
      }
    }
  });

  return { id: opportunityId };
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
  await materializeFallbackWorkflow(opportunityId);
  const detail = await getGridOpportunityDetail(opportunityId);
  if (!detail) {
    throw new Error("Workflow detail could not be loaded.");
  }
  return detail;
}

export async function runWorkflowStepForOpportunity(opportunityId: string, stepName: WorkflowStepName) {
  await materializeFallbackWorkflow(opportunityId, stepName);
  const detail = await getGridOpportunityDetail(opportunityId);
  if (!detail) {
    throw new Error("Workflow detail could not be loaded after step execution.");
  }
  return detail;
}

export async function rerunWorkflowStep(stepRunId: string, requestedBy: string, note?: string) {
  const prisma = await getPrismaClient();
  const existing = await prisma.workflowStepRun.findUnique({
    where: { id: stepRunId },
    include: { opportunity: true },
  });
  if (!existing) {
    throw new Error("Workflow step not found.");
  }

  await prisma.workflowStepRun.update({
    where: { id: stepRunId },
    data: {
      revisionNote: note?.trim() || existing.revisionNote,
    },
  });

  await recordAudit(prisma, "workflow_step_run", stepRunId, "rerun_requested", "human", {
    requestedBy,
    note: note?.trim() || null,
    opportunityId: existing.opportunityId,
    stepName: existing.stepName,
  });

  await materializeFallbackWorkflow(existing.opportunityId, existing.stepName);
  const result = await getGridOpportunityDetail(existing.opportunityId);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after rerun.");
  }
  return result;
}

export async function approveWorkflowStep(stepRunId: string, approvedBy: string) {
  const prisma = await getPrismaClient();
  const stepRun = await prisma.workflowStepRun.findUnique({
    where: { id: stepRunId },
    include: { workflowRun: true },
  });
  if (!stepRun) {
    throw new Error("Workflow step not found.");
  }

  await prisma.workflowStepRun.update({
    where: { id: stepRunId },
    data: {
      status: "approved",
      approvedBy,
      approvedAt: new Date(),
      completedAt: stepRun.completedAt ?? new Date(),
      error: null,
    },
  });

  const latestForRun = await prisma.workflowStepRun.findMany({
    where: { workflowRunId: stepRun.workflowRunId },
    orderBy: [{ stepName: "asc" }, { version: "desc" }],
  });
  const latestByStep = new Map<WorkflowStepName, typeof latestForRun[number]>();
  for (const item of latestForRun) {
    if (!latestByStep.has(item.stepName)) {
      latestByStep.set(item.stepName, item);
    }
  }
  const qaStep = latestByStep.get("qa");
  if (stepRun.stepName === "qa" || (qaStep && qaStep.status === "approved")) {
    await prisma.workflowRun.update({
      where: { id: stepRun.workflowRunId },
      data: { status: "approved", currentStep: "qa", completedAt: new Date(), error: null },
    });
    await prisma.opportunity.update({
      where: { id: stepRun.opportunityId },
      data: { rowStatus: "approved", lastError: null },
    });
  }

  await recordAudit(prisma, "workflow_step_run", stepRunId, "approved", "human", {
    approvedBy,
    opportunityId: stepRun.opportunityId,
    stepName: stepRun.stepName,
  });

  const result = await getGridOpportunityDetail(stepRun.opportunityId);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after approval.");
  }
  return result;
}

export async function requestWorkflowStepRevision(stepRunId: string, requestedBy: string, note: string) {
  const prisma = await getPrismaClient();
  const stepRun = await prisma.workflowStepRun.findUnique({
    where: { id: stepRunId },
    include: { workflowRun: true },
  });
  if (!stepRun) {
    throw new Error("Workflow step not found.");
  }

  await prisma.revisionNote.create({
    data: {
      opportunityId: stepRun.opportunityId,
      workflowStepRunId: stepRun.id,
      note,
      requestedBy,
    },
  });
  await prisma.workflowStepRun.update({
    where: { id: stepRun.id },
    data: {
      status: "needs_review",
      revisionNote: note,
      error: null,
    },
  });
  await prisma.workflowRun.update({
    where: { id: stepRun.workflowRunId },
    data: { status: "blocked", currentStep: stepRun.stepName, error: null },
  });
  await prisma.opportunity.update({
    where: { id: stepRun.opportunityId },
    data: { rowStatus: "blocked", lastError: null },
  });

  await recordAudit(prisma, "workflow_step_run", stepRunId, "revision_requested", "human", {
    requestedBy,
    note,
    opportunityId: stepRun.opportunityId,
    stepName: stepRun.stepName,
  });

  const result = await getGridOpportunityDetail(stepRun.opportunityId);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after revision request.");
  }
  return result;
}

export async function saveWorkflowStepEdit(stepRunId: string, editedBy: string, manualOutput: unknown) {
  const prisma = await getPrismaClient();
  const stepRun = await prisma.workflowStepRun.findUnique({ where: { id: stepRunId } });
  if (!stepRun) {
    throw new Error("Workflow step not found.");
  }

  await prisma.workflowStepRun.update({
    where: { id: stepRunId },
    data: {
      manualOutputJson: manualOutput as never,
      status: stepRun.status === "not_started" ? "needs_review" : stepRun.status,
      completedAt: stepRun.completedAt ?? new Date(),
      error: null,
    },
  });

  await recordAudit(prisma, "workflow_step_run", stepRunId, "manual_edit_saved", "human", {
    editedBy,
    opportunityId: stepRun.opportunityId,
    stepName: stepRun.stepName,
  });

  const result = await getGridOpportunityDetail(stepRun.opportunityId);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after saving manual edit.");
  }
  return result;
}

export async function publishOpportunityFromGrid(opportunityId: string, actor: string) {
  const prisma = await getPrismaClient();
  const workflowRun = await ensureWorkflowRun(prisma, opportunityId);
  const publishCount = await prisma.workflowStepRun.count({
    where: { workflowRunId: workflowRun.id, stepName: "publish" },
  });
  const publishStep = await prisma.workflowStepRun.create({
    data: {
      opportunityId,
      workflowRunId: workflowRun.id,
      stepName: "publish",
      version: publishCount + 1,
      status: "approved",
      startedAt: new Date(),
      completedAt: new Date(),
      outputJson: {
        status: "published",
        message: "Published through the direct web fallback publish path.",
      } as never,
    },
  });

  await prisma.publishResult.create({
    data: {
      opportunityId,
      workflowRunId: workflowRun.id,
      workflowStepRunId: publishStep.id,
      status: "published",
      message: "Published through the direct web fallback publish path.",
      metadataJson: {
        actor,
        publishedAt: new Date().toISOString(),
        mode: "web_fallback",
      } as never,
    },
  });

  await prisma.workflowRun.update({
    where: { id: workflowRun.id },
    data: { status: "published", currentStep: "publish", completedAt: new Date(), error: null },
  });
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { rowStatus: "published", lastError: null },
  });

  await recordAudit(prisma, "workflow_step_run", publishStep.id, "published", "human", {
    actor,
    opportunityId,
  });

  const result = await getGridOpportunityDetail(opportunityId);
  if (!result) {
    throw new Error("Workflow detail could not be loaded after publishing.");
  }
  return result;
}

export async function getGridControlPlaneData() {
  noStore();
  const config = getConfig();
  const ahrefsMode: "live" | "mock" =
    config.APP_MODE === "live" && !config.ENABLE_MOCK_DATA && Boolean(config.AHREFS_API_KEY) ? "live" : "mock";
  const rows = await safeListGridControlPlane();
  if (!rows) {
    return {
      persistenceMode: "mock" as const,
      databaseReady: false,
      ahrefsMode,
      rows: mockRows(),
    };
  }

  return {
    persistenceMode: "database" as const,
    databaseReady: true,
    ahrefsMode,
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
