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
];
export const opportunityPaths = ["blog", "landing_page"];
export const opportunityTypes = [
    "keyword",
    "page_idea",
    "competitor_page",
    "lp_optimization",
];
export const contentFormatTypes = ["listicle", "recipe_listicle", "guide"];
export const rowStatuses = [
    "idle",
    "running",
    "blocked",
    "needs_review",
    "approved",
    "published",
    "failed",
];
export const workflowStepNames = [
    "discovery",
    "prioritization",
    "brief",
    "draft",
    "qa",
    "publish",
];
export const workflowStepStatuses = [
    "not_started",
    "running",
    "completed",
    "failed",
    "needs_review",
    "approved",
];
export const recommendationTypes = [
    "write_now",
    "monitor",
    "refresh_existing",
    "support_cluster",
    "merge_or_decannibalize",
    "skip",
];
export const agentNames = [
    "keyword_discovery",
    "topic_prioritization",
    "content_brief_outline",
    "article_drafting",
    "editorial_qa",
    "publishing_strapi",
    "performance_monitoring_refresh",
];
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
export const contentBriefSchema = z.object({
    id: z.string(),
    topicId: z.string(),
    primaryKeyword: z.string(),
    secondaryKeywords: z.array(z.string()),
    titleOptions: z.array(z.string()),
    intentSummary: z.string(),
    differentiators: z.array(z.string()),
    recommendedInternalLinks: z.array(z.object({
        targetId: z.string(),
        targetUrl: z.string(),
        anchorText: z.string(),
        rationale: z.string(),
    })),
    faqCandidates: z.array(z.string()),
    faqSchemaDraft: z.record(z.unknown()),
    requiredSources: z.array(z.string()),
    factCheckChecklist: z.array(z.string()),
    ctaRecommendations: z.array(z.string()),
    briefJson: z.record(z.unknown()),
});
export const serpResultSchema = z.object({
    rank: z.number(),
    title: z.string(),
    snippet: z.string(),
    url: z.string(),
    isForumOrSocial: z.boolean(),
});
export const competitorKeywordSchema = z.object({
    keyword: z.string(),
    searchVolume: z.number(),
});
export const competitorSnapshotSchema = z.object({
    rank: z.number(),
    url: z.string(),
    title: z.string(),
    metaDescription: z.string().optional(),
    headings: z.array(z.object({
        level: z.number(),
        text: z.string(),
    })),
    semrushKeywords: z.array(competitorKeywordSchema),
    markdown: z.string(),
});
export const keywordOptionSchema = z.object({
    keyword: z.string(),
    searchVolume: z.number(),
});
export const mainLinkSuggestionSchema = z.object({
    keyword: z.string(),
    link: z.string(),
});
export const keywordOverviewSchema = z.object({
    keyword: z.string(),
    searchVolume: z.number(),
    cpc: z.number().optional(),
    competition: z.number().optional(),
    keywordDifficulty: z.number().optional(),
    resultsCount: z.number().optional(),
});
export const mealRecommendationSchema = z.object({
    id: z.string(),
    name: z.string(),
    chef: z.string().optional(),
    dietaryTags: z.array(z.string()).default([]),
    url: z.string().optional(),
    imageUrl: z.string().optional(),
    description: z.string().optional(),
    rating: z.number().optional(),
    day: z.number().optional(),
    slot: z.enum(["lunch", "dinner"]).optional(),
    reason: z.string(),
});
export const popularFoodSchema = z.object({
    name: z.string(),
    category: z.string(),
    reasoning: z.string(),
    matchedKeyword: z.string().optional(),
    searchVolume: z.number().optional(),
});
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
    internalLinks: z.array(z.object({
        label: z.string(),
        url: z.string(),
        anchorText: z.string(),
    })),
    mealRecommendations: z.array(mealRecommendationSchema),
    analysis: z.object({
        persona: z.string(),
        searchIntent: z.string(),
        competitorSummary: z.string(),
        seoOpportunities: z.array(z.string()),
        faqRecommendations: z.array(z.string()),
        mealPlacementSuggestions: z.array(z.string()),
        mealPlanWeek: z.array(z.object({
            day: z.number(),
            lunch: z.string(),
            dinner: z.string(),
        })).optional(),
        personaAnalysis: z.object({
            audiences: z.array(z.string()).default([]),
            motivations: z.array(z.string()).default([]),
            painPoints: z.array(z.string()).default([]),
            desiredOutcomes: z.array(z.string()).default([]),
            coreQuestions: z.array(z.string()).default([]),
            unansweredQuestions: z.array(z.string()).default([]),
            topSecondaryKeywords: z.array(keywordOptionSchema).default([]),
        }),
        competitorAnalysis: z.object({
            topQuestionsAnswered: z.array(z.string()).default([]),
            commonSubtopics: z.array(z.string()).default([]),
            commonStructure: z.array(z.string()).default([]),
            syntaxPatterns: z.array(z.string()).default([]),
            competitors: z.array(z.object({
                title: z.string(),
                url: z.string(),
                sections: z.array(z.object({
                    heading: z.string(),
                    keyQuestion: z.string(),
                    seoRationale: z.string(),
                    shouldAdd: z.boolean(),
                    recommendation: z.string(),
                })).default([]),
            })).default([]),
        }),
        outlineDevelopment: z.object({
            initialH2s: z.array(z.object({
                heading: z.string(),
                source: z.string(),
                justification: z.string(),
            })).default([]),
            h2WithH3s: z.array(z.object({
                heading: z.string(),
                notes: z.string(),
                h3s: z.array(z.string()).default([]),
            })).default([]),
            faqPlan: z.array(z.string()).default([]),
            refinedOutlineNarrative: z.array(z.string()).default([]),
        }),
        cookunityPositioning: z.object({
            relationshipToArticle: z.string(),
            uniqueValue: z.array(z.string()).default([]),
            seoOpportunityDetails: z.array(z.string()).default([]),
            mealIntegrationNotes: z.array(z.string()).default([]),
            ctaDirection: z.string(),
        }),
        evaluation: z.object({
            comprehensiveness: z.string(),
            structure: z.string(),
            seoFit: z.string(),
            toneAndStyle: z.string(),
            verdict: z.string(),
        }),
        outline: z.array(z.object({
            heading: z.string(),
            level: z.number(),
            notes: z.string(),
        })),
    }),
    reviewState: z.object({
        titleApproved: z.boolean().default(false),
        secondaryKeywordsApproved: z.boolean().default(false),
    }),
});
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
    sections: z.array(z.object({
        heading: z.string(),
        level: z.number(),
        body: z.string(),
    })),
    faq: z.array(z.object({
        question: z.string(),
        answer: z.string(),
    })),
    schemaSuggestions: z.array(z.string()),
    ctaSuggestions: z.array(z.string()),
    editorNotes: z.array(z.string()),
    targetKeywords: z.array(z.string()),
    competitorNotes: z.array(z.string()),
    revisionChecklist: z.array(z.string()),
    imagePlan: z.object({
        headerImageTerm: z.string().optional(),
        sectionImages: z.array(z.object({
            header: z.string(),
            searchTerm: z.string(),
            imageUrl: z.string().optional(),
        })).default([]),
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
//# sourceMappingURL=types.js.map