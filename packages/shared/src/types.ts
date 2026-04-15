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
  fieldMapping: Record<string, unknown>;
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
