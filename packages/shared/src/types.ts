import { z } from "zod";

export const workflowStates = [
  "discovered",
  "scored",
  "queued",
  "outline_generated",
  "draft_generated",
  "in_review",
  "revision_requested",
  "approved",
  "published",
  "monitoring",
  "refresh_recommended",
  "refreshed",
] as const;

export type WorkflowState = (typeof workflowStates)[number];

export const opportunityPaths = ["blog", "landing_page"] as const;
export type OpportunityPath = (typeof opportunityPaths)[number];

export const opportunityTypes = [
  "keyword",
  "page_idea",
  "competitor_page",
  "lp_optimization",
] as const;
export type OpportunityType = (typeof opportunityTypes)[number];

export const contentFormatTypes = ["listicle", "recipe_listicle", "guide"] as const;
export type ContentFormatType = (typeof contentFormatTypes)[number];

export const rowStatuses = [
  "idle",
  "running",
  "blocked",
  "needs_review",
  "approved",
  "published",
  "failed",
] as const;
export type RowStatus = (typeof rowStatuses)[number];

export const workflowStepNames = [
  "discovery",
  "prioritization",
  "brief",
  "draft",
  "qa",
  "publish",
] as const;
export type WorkflowStepName = (typeof workflowStepNames)[number];

export const workflowStepStatuses = [
  "not_started",
  "running",
  "completed",
  "failed",
  "needs_review",
  "approved",
] as const;
export type WorkflowStepStatus = (typeof workflowStepStatuses)[number];

export const recommendationTypes = [
  "write_now",
  "monitor",
  "refresh_existing",
  "support_cluster",
  "merge_or_decannibalize",
  "skip",
] as const;

export type RecommendationType = (typeof recommendationTypes)[number];

export const agentNames = [
  "keyword_discovery",
  "topic_prioritization",
  "content_brief_outline",
  "article_drafting",
  "editorial_qa",
  "publishing_strapi",
  "performance_monitoring_refresh",
] as const;

export type AgentName = (typeof agentNames)[number];

export const providerModeSchema = z.enum(["mock", "live"]);

export const topicScoreBreakdownSchema = z.object({
  volumeScore: z.number().min(0).max(100),
  difficultyInverseScore: z.number().min(0).max(100),
  trendScore: z.number().min(0).max(100),
  businessRelevanceScore: z.number().min(0).max(100),
  conversionIntentScore: z.number().min(0).max(100),
  competitorGapScore: z.number().min(0).max(100),
  freshnessScore: z.number().min(0).max(100),
  clusterValueScore: z.number().min(0).max(100),
  authorityFitScore: z.number().min(0).max(100),
});

export type TopicScoreBreakdown = z.infer<typeof topicScoreBreakdownSchema>;

export const topicCandidateSchema = z.object({
  id: z.string(),
  keyword: z.string(),
  normalizedKeyword: z.string(),
  source: z.enum(["ahrefs", "gsc", "trends", "serp", "inventory", "manual"]),
  searchVolume: z.number().nonnegative(),
  keywordDifficulty: z.number().min(0).max(100),
  trendVelocity: z.number().min(-100).max(100),
  businessRelevance: z.number().min(0).max(100),
  conversionIntent: z.number().min(0).max(100),
  serpIntentFit: z.number().min(0).max(100),
  freshnessOpportunity: z.number().min(0).max(100),
  competitorGap: z.number().min(0).max(100),
  clusterValue: z.number().min(0).max(100),
  authorityFit: z.number().min(0).max(100),
  status: z.enum(workflowStates),
  recommendation: z.enum(recommendationTypes),
  explanation: z.string(),
  relatedExistingContentIds: z.array(z.string()).default([]),
  createdAt: z.string(),
});

export type TopicCandidate = z.infer<typeof topicCandidateSchema>;

export const contentBriefSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  primaryKeyword: z.string(),
  secondaryKeywords: z.array(z.string()),
  titleOptions: z.array(z.string()),
  intentSummary: z.string(),
  differentiators: z.array(z.string()),
  recommendedInternalLinks: z.array(
    z.object({
      targetId: z.string(),
      targetUrl: z.string(),
      anchorText: z.string(),
      rationale: z.string(),
    }),
  ),
  faqCandidates: z.array(z.string()),
  faqSchemaDraft: z.record(z.unknown()),
  requiredSources: z.array(z.string()),
  factCheckChecklist: z.array(z.string()),
  ctaRecommendations: z.array(z.string()),
  briefJson: z.record(z.unknown()),
});

export type ContentBrief = z.infer<typeof contentBriefSchema>;

export const serpResultSchema = z.object({
  rank: z.number(),
  title: z.string(),
  snippet: z.string(),
  url: z.string(),
  isForumOrSocial: z.boolean(),
});

export type SerpResult = z.infer<typeof serpResultSchema>;

export const competitorKeywordSchema = z.object({
  keyword: z.string(),
  searchVolume: z.number(),
});

export type CompetitorKeyword = z.infer<typeof competitorKeywordSchema>;

export const competitorSnapshotSchema = z.object({
  rank: z.number(),
  url: z.string(),
  title: z.string(),
  metaDescription: z.string().optional(),
  headings: z.array(
    z.object({
      level: z.number(),
      text: z.string(),
    }),
  ),
  semrushKeywords: z.array(competitorKeywordSchema),
  markdown: z.string(),
});

export type CompetitorSnapshot = z.infer<typeof competitorSnapshotSchema>;

export const keywordOptionSchema = z.object({
  keyword: z.string(),
  searchVolume: z.number(),
});

export type KeywordOption = z.infer<typeof keywordOptionSchema>;

export const mainLinkSuggestionSchema = z.object({
  keyword: z.string(),
  link: z.string(),
});

export type MainLinkSuggestion = z.infer<typeof mainLinkSuggestionSchema>;

export const keywordOverviewSchema = z.object({
  keyword: z.string(),
  searchVolume: z.number(),
  cpc: z.number().optional(),
  competition: z.number().optional(),
  keywordDifficulty: z.number().optional(),
  resultsCount: z.number().optional(),
});

export type KeywordOverview = z.infer<typeof keywordOverviewSchema>;

export const mealRecommendationSchema = z.object({
  id: z.string(),
  name: z.string(),
  chef: z.string().optional(),
  dietaryTags: z.array(z.string()).default([]),
  reason: z.string(),
});

export type MealRecommendation = z.infer<typeof mealRecommendationSchema>;

export const popularFoodSchema = z.object({
  name: z.string(),
  category: z.string(),
  reasoning: z.string(),
  matchedKeyword: z.string().optional(),
  searchVolume: z.number().optional(),
});

export type PopularFood = z.infer<typeof popularFoodSchema>;

export const outlinePackageSchema = z.object({
  primaryKeyword: z.string(),
  contentFormat: z.enum(contentFormatTypes).default("guide"),
  keywordOverview: keywordOverviewSchema.optional(),
  mainInternalLink: mainLinkSuggestionSchema.optional(),
  keywordList: z.array(keywordOptionSchema),
  popularFoods: z.array(popularFoodSchema).default([]),
  serpResults: z.array(serpResultSchema),
  competitors: z.array(competitorSnapshotSchema),
  competitorKeywordRollup: z.array(keywordOptionSchema),
  titleOptions: z.array(z.string()),
  selectedTitle: z.string().optional(),
  slugOptions: z.array(z.string()).default([]),
  selectedSlug: z.string().optional(),
  secondaryKeywordOptions: z.array(keywordOptionSchema),
  selectedSecondaryKeywords: z.array(keywordOptionSchema).default([]),
  internalLinks: z.array(
    z.object({
      label: z.string(),
      url: z.string(),
      anchorText: z.string(),
    }),
  ),
  mealRecommendations: z.array(mealRecommendationSchema),
  analysis: z.object({
    persona: z.string(),
    searchIntent: z.string(),
    competitorSummary: z.string(),
    seoOpportunities: z.array(z.string()),
    faqRecommendations: z.array(z.string()),
    mealPlacementSuggestions: z.array(z.string()),
    outline: z.array(
      z.object({
        heading: z.string(),
        level: z.number(),
        notes: z.string(),
      }),
    ),
  }),
  reviewState: z.object({
    titleApproved: z.boolean().default(false),
    secondaryKeywordsApproved: z.boolean().default(false),
  }),
});

export type OutlinePackage = z.infer<typeof outlinePackageSchema>;

export const draftSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  briefId: z.string(),
  promptVersionId: z.string(),
  titleTagOptions: z.array(z.string()),
  metaDescriptionOptions: z.array(z.string()),
  slugRecommendation: z.string(),
  h1: z.string(),
  intro: z.string(),
  keyTakeaways: z.array(z.string()).default([]),
  sections: z.array(
    z.object({
      heading: z.string(),
      level: z.number(),
      body: z.string(),
    }),
  ),
  faq: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
  ),
  schemaSuggestions: z.array(z.string()),
  ctaSuggestions: z.array(z.string()),
  editorNotes: z.array(z.string()),
  targetKeywords: z.array(z.string()),
  competitorNotes: z.array(z.string()),
  revisionChecklist: z.array(z.string()),
  imagePlan: z.object({
    headerImageTerm: z.string().optional(),
    sectionImages: z.array(
      z.object({
        header: z.string(),
        searchTerm: z.string(),
        imageUrl: z.string().optional(),
      }),
    ).default([]),
  }).optional(),
  publishPackage: z.object({
    slug: z.string(),
    description: z.string(),
    blocks: z.array(z.record(z.unknown())).default([]),
    mealCarouselInsertions: z.number().default(0),
  }).optional(),
  html: z.string(),
  createdAt: z.string(),
});

export type Draft = z.infer<typeof draftSchema>;

export const optimizationTaskSchema = z.object({
  id: z.string(),
  topicId: z.string().optional(),
  publicationId: z.string(),
  type: z.enum([
    "refresh_article",
    "expand_cluster",
    "improve_ctr",
    "strengthen_internal_links",
    "merge_content",
    "add_faq",
  ]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string(),
  actions: z.array(z.string()),
  metricsContext: z.record(z.unknown()),
  createdAt: z.string(),
});

export type OptimizationTask = z.infer<typeof optimizationTaskSchema>;

export type AuditActor = "system" | "reviewer" | "publisher";

export interface QueueJobPayload {
  runId: string;
  topicId?: string;
  publicationId?: string;
}

export const workflowEventSchema = z.object({
  runId: z.string(),
  entityId: z.string(),
  entityType: z.string(),
  fromState: z.string().optional(),
  toState: z.string(),
  agent: z.enum(agentNames),
  approvedByHuman: z.boolean().default(false),
  occurredAt: z.string(),
  details: z.record(z.unknown()).default({}),
});

export type WorkflowEvent = z.infer<typeof workflowEventSchema>;

export interface AgentExecutionEnvelope<TInput, TOutput> {
  agent: AgentName;
  idempotencyKey: string;
  promptVersionId?: string;
  input: TInput;
  output: TOutput;
  attempts: number;
  executedAt: string;
}

export interface KeywordDiscoveryInput {
  seedTerms: string[];
  existingInventory: Array<{
    id: string;
    title: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
  }>;
}

export interface KeywordDiscoveryOutput {
  candidates: Array<{
    keyword: string;
    source: "ahrefs" | "gsc" | "trends" | "serp";
    searchVolume: number;
    keywordDifficulty: number;
    trendVelocity: number;
    intent: string;
    notes?: string;
  }>;
}

export interface TopicPrioritizationInput {
  candidates: KeywordDiscoveryOutput["candidates"];
  existingInventory: KeywordDiscoveryInput["existingInventory"];
}

export interface PrioritizedTopicRecord {
  keyword: string;
  totalScore: number;
  explanation: string;
  recommendation: RecommendationType;
  cannibalizationRisk: number;
  topicType: "new_article" | "refresh_existing" | "support_cluster" | "merge";
  breakdown: TopicScoreBreakdown;
}

export interface TopicPrioritizationOutput {
  rankedTopics: PrioritizedTopicRecord[];
}

export interface ContentBriefAgentInput {
  topic: PrioritizedTopicRecord;
}

export interface ContentBriefAgentOutput {
  brief: ContentBrief;
}

export interface ArticleDraftingInput {
  brief: ContentBrief;
}

export interface ArticleDraftingOutput {
  draft: Draft;
}

export interface EditorialQaInput {
  brief: ContentBrief;
  draft: Draft;
}

export interface EditorialQaOutput {
  passed: boolean;
  flags: string[];
  requiresHumanReview: boolean;
  normalizedDraft: Draft;
}

export interface PublishingAgentInput {
  draft: Draft;
  approved: boolean;
  tags: string[];
  categories: string[];
  canonicalUrl?: string;
  excerpt?: string;
  featuredImage?: string;
  existingEntryId?: string;
  existingDocumentId?: string;
}

export interface PublishingAgentOutput {
  entryId: string;
  documentId?: string;
  previewUrl?: string;
  fieldMapping: unknown;
}

export interface PerformanceMonitoringInput {
  urls: string[];
}

export interface PerformanceMonitoringOutput {
  tasks: OptimizationTask[];
  snapshots: Array<{
    url: string;
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    averagePosition: number;
    conversions: number;
  }>;
}
