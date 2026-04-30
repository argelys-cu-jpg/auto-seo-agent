import { z } from "zod";
export declare const workflowStates: readonly ["discovered", "scored", "queued", "outline_generated", "draft_generated", "in_review", "revision_requested", "approved", "published", "monitoring", "refresh_recommended", "refreshed"];
export type WorkflowState = (typeof workflowStates)[number];
export declare const opportunityPaths: readonly ["blog", "landing_page"];
export type OpportunityPath = (typeof opportunityPaths)[number];
export declare const opportunityTypes: readonly ["keyword", "page_idea", "competitor_page", "lp_optimization"];
export type OpportunityType = (typeof opportunityTypes)[number];
export declare const contentFormatTypes: readonly ["listicle", "recipe_listicle", "guide"];
export type ContentFormatType = (typeof contentFormatTypes)[number];
export declare const rowStatuses: readonly ["idle", "running", "blocked", "needs_review", "approved", "published", "failed"];
export type RowStatus = (typeof rowStatuses)[number];
export declare const workflowStepNames: readonly ["discovery", "prioritization", "brief", "draft", "qa", "publish"];
export type WorkflowStepName = (typeof workflowStepNames)[number];
export declare const workflowStepStatuses: readonly ["not_started", "running", "completed", "failed", "needs_review", "approved"];
export type WorkflowStepStatus = (typeof workflowStepStatuses)[number];
export declare const recommendationTypes: readonly ["write_now", "monitor", "refresh_existing", "support_cluster", "merge_or_decannibalize", "skip"];
export type RecommendationType = (typeof recommendationTypes)[number];
export declare const agentNames: readonly ["keyword_discovery", "topic_prioritization", "content_brief_outline", "article_drafting", "editorial_qa", "publishing_strapi", "performance_monitoring_refresh"];
export type AgentName = (typeof agentNames)[number];
export declare const providerModeSchema: z.ZodEnum<["mock", "live"]>;
export declare const topicScoreBreakdownSchema: z.ZodObject<{
    volumeScore: z.ZodNumber;
    difficultyInverseScore: z.ZodNumber;
    trendScore: z.ZodNumber;
    businessRelevanceScore: z.ZodNumber;
    conversionIntentScore: z.ZodNumber;
    competitorGapScore: z.ZodNumber;
    freshnessScore: z.ZodNumber;
    clusterValueScore: z.ZodNumber;
    authorityFitScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    volumeScore: number;
    difficultyInverseScore: number;
    trendScore: number;
    businessRelevanceScore: number;
    conversionIntentScore: number;
    competitorGapScore: number;
    freshnessScore: number;
    clusterValueScore: number;
    authorityFitScore: number;
}, {
    volumeScore: number;
    difficultyInverseScore: number;
    trendScore: number;
    businessRelevanceScore: number;
    conversionIntentScore: number;
    competitorGapScore: number;
    freshnessScore: number;
    clusterValueScore: number;
    authorityFitScore: number;
}>;
export type TopicScoreBreakdown = z.infer<typeof topicScoreBreakdownSchema>;
export declare const topicCandidateSchema: z.ZodObject<{
    id: z.ZodString;
    keyword: z.ZodString;
    normalizedKeyword: z.ZodString;
    source: z.ZodEnum<["ahrefs", "gsc", "trends", "serp", "inventory", "manual"]>;
    searchVolume: z.ZodNumber;
    keywordDifficulty: z.ZodNumber;
    trendVelocity: z.ZodNumber;
    businessRelevance: z.ZodNumber;
    conversionIntent: z.ZodNumber;
    serpIntentFit: z.ZodNumber;
    freshnessOpportunity: z.ZodNumber;
    competitorGap: z.ZodNumber;
    clusterValue: z.ZodNumber;
    authorityFit: z.ZodNumber;
    status: z.ZodEnum<["discovered", "scored", "queued", "outline_generated", "draft_generated", "in_review", "revision_requested", "approved", "published", "monitoring", "refresh_recommended", "refreshed"]>;
    recommendation: z.ZodEnum<["write_now", "monitor", "refresh_existing", "support_cluster", "merge_or_decannibalize", "skip"]>;
    explanation: z.ZodString;
    relatedExistingContentIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    keyword: string;
    status: "discovered" | "scored" | "queued" | "outline_generated" | "draft_generated" | "in_review" | "revision_requested" | "approved" | "published" | "monitoring" | "refresh_recommended" | "refreshed";
    id: string;
    normalizedKeyword: string;
    source: "ahrefs" | "gsc" | "trends" | "serp" | "inventory" | "manual";
    searchVolume: number;
    keywordDifficulty: number;
    trendVelocity: number;
    businessRelevance: number;
    conversionIntent: number;
    serpIntentFit: number;
    freshnessOpportunity: number;
    competitorGap: number;
    clusterValue: number;
    authorityFit: number;
    recommendation: "write_now" | "monitor" | "refresh_existing" | "support_cluster" | "merge_or_decannibalize" | "skip";
    explanation: string;
    relatedExistingContentIds: string[];
    createdAt: string;
}, {
    keyword: string;
    status: "discovered" | "scored" | "queued" | "outline_generated" | "draft_generated" | "in_review" | "revision_requested" | "approved" | "published" | "monitoring" | "refresh_recommended" | "refreshed";
    id: string;
    normalizedKeyword: string;
    source: "ahrefs" | "gsc" | "trends" | "serp" | "inventory" | "manual";
    searchVolume: number;
    keywordDifficulty: number;
    trendVelocity: number;
    businessRelevance: number;
    conversionIntent: number;
    serpIntentFit: number;
    freshnessOpportunity: number;
    competitorGap: number;
    clusterValue: number;
    authorityFit: number;
    recommendation: "write_now" | "monitor" | "refresh_existing" | "support_cluster" | "merge_or_decannibalize" | "skip";
    explanation: string;
    createdAt: string;
    relatedExistingContentIds?: string[] | undefined;
}>;
export type TopicCandidate = z.infer<typeof topicCandidateSchema>;
export declare const contentBriefSchema: z.ZodObject<{
    id: z.ZodString;
    topicId: z.ZodString;
    primaryKeyword: z.ZodString;
    secondaryKeywords: z.ZodArray<z.ZodString, "many">;
    titleOptions: z.ZodArray<z.ZodString, "many">;
    intentSummary: z.ZodString;
    differentiators: z.ZodArray<z.ZodString, "many">;
    recommendedInternalLinks: z.ZodArray<z.ZodObject<{
        targetId: z.ZodString;
        targetUrl: z.ZodString;
        anchorText: z.ZodString;
        rationale: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        targetId: string;
        targetUrl: string;
        anchorText: string;
        rationale: string;
    }, {
        targetId: string;
        targetUrl: string;
        anchorText: string;
        rationale: string;
    }>, "many">;
    faqCandidates: z.ZodArray<z.ZodString, "many">;
    faqSchemaDraft: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    requiredSources: z.ZodArray<z.ZodString, "many">;
    factCheckChecklist: z.ZodArray<z.ZodString, "many">;
    ctaRecommendations: z.ZodArray<z.ZodString, "many">;
    briefJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    id: string;
    topicId: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    titleOptions: string[];
    intentSummary: string;
    differentiators: string[];
    recommendedInternalLinks: {
        targetId: string;
        targetUrl: string;
        anchorText: string;
        rationale: string;
    }[];
    faqCandidates: string[];
    faqSchemaDraft: Record<string, unknown>;
    requiredSources: string[];
    factCheckChecklist: string[];
    ctaRecommendations: string[];
    briefJson: Record<string, unknown>;
}, {
    id: string;
    topicId: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    titleOptions: string[];
    intentSummary: string;
    differentiators: string[];
    recommendedInternalLinks: {
        targetId: string;
        targetUrl: string;
        anchorText: string;
        rationale: string;
    }[];
    faqCandidates: string[];
    faqSchemaDraft: Record<string, unknown>;
    requiredSources: string[];
    factCheckChecklist: string[];
    ctaRecommendations: string[];
    briefJson: Record<string, unknown>;
}>;
export type ContentBrief = z.infer<typeof contentBriefSchema>;
export declare const serpResultSchema: z.ZodObject<{
    rank: z.ZodNumber;
    title: z.ZodString;
    snippet: z.ZodString;
    url: z.ZodString;
    isForumOrSocial: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    rank: number;
    title: string;
    snippet: string;
    url: string;
    isForumOrSocial: boolean;
}, {
    rank: number;
    title: string;
    snippet: string;
    url: string;
    isForumOrSocial: boolean;
}>;
export type SerpResult = z.infer<typeof serpResultSchema>;
export declare const competitorKeywordSchema: z.ZodObject<{
    keyword: z.ZodString;
    searchVolume: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    keyword: string;
    searchVolume: number;
}, {
    keyword: string;
    searchVolume: number;
}>;
export type CompetitorKeyword = z.infer<typeof competitorKeywordSchema>;
export declare const competitorSnapshotSchema: z.ZodObject<{
    rank: z.ZodNumber;
    url: z.ZodString;
    title: z.ZodString;
    metaDescription: z.ZodOptional<z.ZodString>;
    headings: z.ZodArray<z.ZodObject<{
        level: z.ZodNumber;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        level: number;
        text: string;
    }, {
        level: number;
        text: string;
    }>, "many">;
    semrushKeywords: z.ZodArray<z.ZodObject<{
        keyword: z.ZodString;
        searchVolume: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        keyword: string;
        searchVolume: number;
    }, {
        keyword: string;
        searchVolume: number;
    }>, "many">;
    markdown: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rank: number;
    title: string;
    url: string;
    headings: {
        level: number;
        text: string;
    }[];
    semrushKeywords: {
        keyword: string;
        searchVolume: number;
    }[];
    markdown: string;
    metaDescription?: string | undefined;
}, {
    rank: number;
    title: string;
    url: string;
    headings: {
        level: number;
        text: string;
    }[];
    semrushKeywords: {
        keyword: string;
        searchVolume: number;
    }[];
    markdown: string;
    metaDescription?: string | undefined;
}>;
export type CompetitorSnapshot = z.infer<typeof competitorSnapshotSchema>;
export declare const keywordOptionSchema: z.ZodObject<{
    keyword: z.ZodString;
    searchVolume: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    keyword: string;
    searchVolume: number;
}, {
    keyword: string;
    searchVolume: number;
}>;
export type KeywordOption = z.infer<typeof keywordOptionSchema>;
export declare const mainLinkSuggestionSchema: z.ZodObject<{
    keyword: z.ZodString;
    link: z.ZodString;
}, "strip", z.ZodTypeAny, {
    keyword: string;
    link: string;
}, {
    keyword: string;
    link: string;
}>;
export type MainLinkSuggestion = z.infer<typeof mainLinkSuggestionSchema>;
export declare const keywordOverviewSchema: z.ZodObject<{
    keyword: z.ZodString;
    searchVolume: z.ZodNumber;
    cpc: z.ZodOptional<z.ZodNumber>;
    competition: z.ZodOptional<z.ZodNumber>;
    keywordDifficulty: z.ZodOptional<z.ZodNumber>;
    resultsCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    keyword: string;
    searchVolume: number;
    keywordDifficulty?: number | undefined;
    cpc?: number | undefined;
    competition?: number | undefined;
    resultsCount?: number | undefined;
}, {
    keyword: string;
    searchVolume: number;
    keywordDifficulty?: number | undefined;
    cpc?: number | undefined;
    competition?: number | undefined;
    resultsCount?: number | undefined;
}>;
export type KeywordOverview = z.infer<typeof keywordOverviewSchema>;
export declare const mealRecommendationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    chef: z.ZodOptional<z.ZodString>;
    dietaryTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    url: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    rating: z.ZodOptional<z.ZodNumber>;
    day: z.ZodOptional<z.ZodNumber>;
    slot: z.ZodOptional<z.ZodEnum<["lunch", "dinner"]>>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    dietaryTags: string[];
    reason: string;
    url?: string | undefined;
    chef?: string | undefined;
    imageUrl?: string | undefined;
    description?: string | undefined;
    rating?: number | undefined;
    day?: number | undefined;
    slot?: "lunch" | "dinner" | undefined;
}, {
    id: string;
    name: string;
    reason: string;
    url?: string | undefined;
    chef?: string | undefined;
    dietaryTags?: string[] | undefined;
    imageUrl?: string | undefined;
    description?: string | undefined;
    rating?: number | undefined;
    day?: number | undefined;
    slot?: "lunch" | "dinner" | undefined;
}>;
export type MealRecommendation = z.infer<typeof mealRecommendationSchema>;
export declare const popularFoodSchema: z.ZodObject<{
    name: z.ZodString;
    category: z.ZodString;
    reasoning: z.ZodString;
    matchedKeyword: z.ZodOptional<z.ZodString>;
    searchVolume: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    category: string;
    reasoning: string;
    searchVolume?: number | undefined;
    matchedKeyword?: string | undefined;
}, {
    name: string;
    category: string;
    reasoning: string;
    searchVolume?: number | undefined;
    matchedKeyword?: string | undefined;
}>;
export type PopularFood = z.infer<typeof popularFoodSchema>;
export declare const outlinePackageSchema: z.ZodObject<{
    primaryKeyword: z.ZodString;
    contentFormat: z.ZodDefault<z.ZodEnum<["listicle", "recipe_listicle", "guide"]>>;
    keywordOverview: z.ZodOptional<z.ZodObject<{
        keyword: z.ZodString;
        searchVolume: z.ZodNumber;
        cpc: z.ZodOptional<z.ZodNumber>;
        competition: z.ZodOptional<z.ZodNumber>;
        keywordDifficulty: z.ZodOptional<z.ZodNumber>;
        resultsCount: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        keyword: string;
        searchVolume: number;
        keywordDifficulty?: number | undefined;
        cpc?: number | undefined;
        competition?: number | undefined;
        resultsCount?: number | undefined;
    }, {
        keyword: string;
        searchVolume: number;
        keywordDifficulty?: number | undefined;
        cpc?: number | undefined;
        competition?: number | undefined;
        resultsCount?: number | undefined;
    }>>;
    mainInternalLink: z.ZodOptional<z.ZodObject<{
        keyword: z.ZodString;
        link: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        keyword: string;
        link: string;
    }, {
        keyword: string;
        link: string;
    }>>;
    keywordList: z.ZodArray<z.ZodObject<{
        keyword: z.ZodString;
        searchVolume: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        keyword: string;
        searchVolume: number;
    }, {
        keyword: string;
        searchVolume: number;
    }>, "many">;
    popularFoods: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        category: z.ZodString;
        reasoning: z.ZodString;
        matchedKeyword: z.ZodOptional<z.ZodString>;
        searchVolume: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        category: string;
        reasoning: string;
        searchVolume?: number | undefined;
        matchedKeyword?: string | undefined;
    }, {
        name: string;
        category: string;
        reasoning: string;
        searchVolume?: number | undefined;
        matchedKeyword?: string | undefined;
    }>, "many">>;
    serpResults: z.ZodArray<z.ZodObject<{
        rank: z.ZodNumber;
        title: z.ZodString;
        snippet: z.ZodString;
        url: z.ZodString;
        isForumOrSocial: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        rank: number;
        title: string;
        snippet: string;
        url: string;
        isForumOrSocial: boolean;
    }, {
        rank: number;
        title: string;
        snippet: string;
        url: string;
        isForumOrSocial: boolean;
    }>, "many">;
    competitors: z.ZodArray<z.ZodObject<{
        rank: z.ZodNumber;
        url: z.ZodString;
        title: z.ZodString;
        metaDescription: z.ZodOptional<z.ZodString>;
        headings: z.ZodArray<z.ZodObject<{
            level: z.ZodNumber;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            level: number;
            text: string;
        }, {
            level: number;
            text: string;
        }>, "many">;
        semrushKeywords: z.ZodArray<z.ZodObject<{
            keyword: z.ZodString;
            searchVolume: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            keyword: string;
            searchVolume: number;
        }, {
            keyword: string;
            searchVolume: number;
        }>, "many">;
        markdown: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        rank: number;
        title: string;
        url: string;
        headings: {
            level: number;
            text: string;
        }[];
        semrushKeywords: {
            keyword: string;
            searchVolume: number;
        }[];
        markdown: string;
        metaDescription?: string | undefined;
    }, {
        rank: number;
        title: string;
        url: string;
        headings: {
            level: number;
            text: string;
        }[];
        semrushKeywords: {
            keyword: string;
            searchVolume: number;
        }[];
        markdown: string;
        metaDescription?: string | undefined;
    }>, "many">;
    competitorKeywordRollup: z.ZodArray<z.ZodObject<{
        keyword: z.ZodString;
        searchVolume: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        keyword: string;
        searchVolume: number;
    }, {
        keyword: string;
        searchVolume: number;
    }>, "many">;
    titleOptions: z.ZodArray<z.ZodString, "many">;
    selectedTitle: z.ZodOptional<z.ZodString>;
    slugOptions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    selectedSlug: z.ZodOptional<z.ZodString>;
    secondaryKeywordOptions: z.ZodArray<z.ZodObject<{
        keyword: z.ZodString;
        searchVolume: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        keyword: string;
        searchVolume: number;
    }, {
        keyword: string;
        searchVolume: number;
    }>, "many">;
    selectedSecondaryKeywords: z.ZodDefault<z.ZodArray<z.ZodObject<{
        keyword: z.ZodString;
        searchVolume: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        keyword: string;
        searchVolume: number;
    }, {
        keyword: string;
        searchVolume: number;
    }>, "many">>;
    internalLinks: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        url: z.ZodString;
        anchorText: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        anchorText: string;
        url: string;
        label: string;
    }, {
        anchorText: string;
        url: string;
        label: string;
    }>, "many">;
    mealRecommendations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        chef: z.ZodOptional<z.ZodString>;
        dietaryTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        url: z.ZodOptional<z.ZodString>;
        imageUrl: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        rating: z.ZodOptional<z.ZodNumber>;
        day: z.ZodOptional<z.ZodNumber>;
        slot: z.ZodOptional<z.ZodEnum<["lunch", "dinner"]>>;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        dietaryTags: string[];
        reason: string;
        url?: string | undefined;
        chef?: string | undefined;
        imageUrl?: string | undefined;
        description?: string | undefined;
        rating?: number | undefined;
        day?: number | undefined;
        slot?: "lunch" | "dinner" | undefined;
    }, {
        id: string;
        name: string;
        reason: string;
        url?: string | undefined;
        chef?: string | undefined;
        dietaryTags?: string[] | undefined;
        imageUrl?: string | undefined;
        description?: string | undefined;
        rating?: number | undefined;
        day?: number | undefined;
        slot?: "lunch" | "dinner" | undefined;
    }>, "many">;
    analysis: z.ZodObject<{
        persona: z.ZodString;
        searchIntent: z.ZodString;
        competitorSummary: z.ZodString;
        seoOpportunities: z.ZodArray<z.ZodString, "many">;
        faqRecommendations: z.ZodArray<z.ZodString, "many">;
        mealPlacementSuggestions: z.ZodArray<z.ZodString, "many">;
        mealPlanWeek: z.ZodOptional<z.ZodArray<z.ZodObject<{
            day: z.ZodNumber;
            lunch: z.ZodString;
            dinner: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            day: number;
            lunch: string;
            dinner: string;
        }, {
            day: number;
            lunch: string;
            dinner: string;
        }>, "many">>;
        personaAnalysis: z.ZodObject<{
            audiences: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            motivations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            painPoints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            desiredOutcomes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            coreQuestions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            unansweredQuestions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            topSecondaryKeywords: z.ZodDefault<z.ZodArray<z.ZodObject<{
                keyword: z.ZodString;
                searchVolume: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                keyword: string;
                searchVolume: number;
            }, {
                keyword: string;
                searchVolume: number;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            audiences: string[];
            motivations: string[];
            painPoints: string[];
            desiredOutcomes: string[];
            coreQuestions: string[];
            unansweredQuestions: string[];
            topSecondaryKeywords: {
                keyword: string;
                searchVolume: number;
            }[];
        }, {
            audiences?: string[] | undefined;
            motivations?: string[] | undefined;
            painPoints?: string[] | undefined;
            desiredOutcomes?: string[] | undefined;
            coreQuestions?: string[] | undefined;
            unansweredQuestions?: string[] | undefined;
            topSecondaryKeywords?: {
                keyword: string;
                searchVolume: number;
            }[] | undefined;
        }>;
        competitorAnalysis: z.ZodObject<{
            topQuestionsAnswered: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            commonSubtopics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            commonStructure: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            syntaxPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            competitors: z.ZodDefault<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                url: z.ZodString;
                sections: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    heading: z.ZodString;
                    keyQuestion: z.ZodString;
                    seoRationale: z.ZodString;
                    shouldAdd: z.ZodBoolean;
                    recommendation: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }, {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                title: string;
                url: string;
                sections: {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }[];
            }, {
                title: string;
                url: string;
                sections?: {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }[] | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            competitors: {
                title: string;
                url: string;
                sections: {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }[];
            }[];
            topQuestionsAnswered: string[];
            commonSubtopics: string[];
            commonStructure: string[];
            syntaxPatterns: string[];
        }, {
            competitors?: {
                title: string;
                url: string;
                sections?: {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }[] | undefined;
            }[] | undefined;
            topQuestionsAnswered?: string[] | undefined;
            commonSubtopics?: string[] | undefined;
            commonStructure?: string[] | undefined;
            syntaxPatterns?: string[] | undefined;
        }>;
        outlineDevelopment: z.ZodObject<{
            initialH2s: z.ZodDefault<z.ZodArray<z.ZodObject<{
                heading: z.ZodString;
                source: z.ZodString;
                justification: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                source: string;
                heading: string;
                justification: string;
            }, {
                source: string;
                heading: string;
                justification: string;
            }>, "many">>;
            h2WithH3s: z.ZodDefault<z.ZodArray<z.ZodObject<{
                heading: z.ZodString;
                notes: z.ZodString;
                h3s: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                heading: string;
                notes: string;
                h3s: string[];
            }, {
                heading: string;
                notes: string;
                h3s?: string[] | undefined;
            }>, "many">>;
            faqPlan: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            refinedOutlineNarrative: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            initialH2s: {
                source: string;
                heading: string;
                justification: string;
            }[];
            h2WithH3s: {
                heading: string;
                notes: string;
                h3s: string[];
            }[];
            faqPlan: string[];
            refinedOutlineNarrative: string[];
        }, {
            initialH2s?: {
                source: string;
                heading: string;
                justification: string;
            }[] | undefined;
            h2WithH3s?: {
                heading: string;
                notes: string;
                h3s?: string[] | undefined;
            }[] | undefined;
            faqPlan?: string[] | undefined;
            refinedOutlineNarrative?: string[] | undefined;
        }>;
        cookunityPositioning: z.ZodObject<{
            relationshipToArticle: z.ZodString;
            uniqueValue: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            seoOpportunityDetails: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            mealIntegrationNotes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            ctaDirection: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            relationshipToArticle: string;
            uniqueValue: string[];
            seoOpportunityDetails: string[];
            mealIntegrationNotes: string[];
            ctaDirection: string;
        }, {
            relationshipToArticle: string;
            ctaDirection: string;
            uniqueValue?: string[] | undefined;
            seoOpportunityDetails?: string[] | undefined;
            mealIntegrationNotes?: string[] | undefined;
        }>;
        evaluation: z.ZodObject<{
            comprehensiveness: z.ZodString;
            structure: z.ZodString;
            seoFit: z.ZodString;
            toneAndStyle: z.ZodString;
            verdict: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            comprehensiveness: string;
            structure: string;
            seoFit: string;
            toneAndStyle: string;
            verdict: string;
        }, {
            comprehensiveness: string;
            structure: string;
            seoFit: string;
            toneAndStyle: string;
            verdict: string;
        }>;
        outline: z.ZodArray<z.ZodObject<{
            heading: z.ZodString;
            level: z.ZodNumber;
            notes: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            level: number;
            heading: string;
            notes: string;
        }, {
            level: number;
            heading: string;
            notes: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        persona: string;
        searchIntent: string;
        competitorSummary: string;
        seoOpportunities: string[];
        faqRecommendations: string[];
        mealPlacementSuggestions: string[];
        personaAnalysis: {
            audiences: string[];
            motivations: string[];
            painPoints: string[];
            desiredOutcomes: string[];
            coreQuestions: string[];
            unansweredQuestions: string[];
            topSecondaryKeywords: {
                keyword: string;
                searchVolume: number;
            }[];
        };
        competitorAnalysis: {
            competitors: {
                title: string;
                url: string;
                sections: {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }[];
            }[];
            topQuestionsAnswered: string[];
            commonSubtopics: string[];
            commonStructure: string[];
            syntaxPatterns: string[];
        };
        outlineDevelopment: {
            initialH2s: {
                source: string;
                heading: string;
                justification: string;
            }[];
            h2WithH3s: {
                heading: string;
                notes: string;
                h3s: string[];
            }[];
            faqPlan: string[];
            refinedOutlineNarrative: string[];
        };
        cookunityPositioning: {
            relationshipToArticle: string;
            uniqueValue: string[];
            seoOpportunityDetails: string[];
            mealIntegrationNotes: string[];
            ctaDirection: string;
        };
        evaluation: {
            comprehensiveness: string;
            structure: string;
            seoFit: string;
            toneAndStyle: string;
            verdict: string;
        };
        outline: {
            level: number;
            heading: string;
            notes: string;
        }[];
        mealPlanWeek?: {
            day: number;
            lunch: string;
            dinner: string;
        }[] | undefined;
    }, {
        persona: string;
        searchIntent: string;
        competitorSummary: string;
        seoOpportunities: string[];
        faqRecommendations: string[];
        mealPlacementSuggestions: string[];
        personaAnalysis: {
            audiences?: string[] | undefined;
            motivations?: string[] | undefined;
            painPoints?: string[] | undefined;
            desiredOutcomes?: string[] | undefined;
            coreQuestions?: string[] | undefined;
            unansweredQuestions?: string[] | undefined;
            topSecondaryKeywords?: {
                keyword: string;
                searchVolume: number;
            }[] | undefined;
        };
        competitorAnalysis: {
            competitors?: {
                title: string;
                url: string;
                sections?: {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }[] | undefined;
            }[] | undefined;
            topQuestionsAnswered?: string[] | undefined;
            commonSubtopics?: string[] | undefined;
            commonStructure?: string[] | undefined;
            syntaxPatterns?: string[] | undefined;
        };
        outlineDevelopment: {
            initialH2s?: {
                source: string;
                heading: string;
                justification: string;
            }[] | undefined;
            h2WithH3s?: {
                heading: string;
                notes: string;
                h3s?: string[] | undefined;
            }[] | undefined;
            faqPlan?: string[] | undefined;
            refinedOutlineNarrative?: string[] | undefined;
        };
        cookunityPositioning: {
            relationshipToArticle: string;
            ctaDirection: string;
            uniqueValue?: string[] | undefined;
            seoOpportunityDetails?: string[] | undefined;
            mealIntegrationNotes?: string[] | undefined;
        };
        evaluation: {
            comprehensiveness: string;
            structure: string;
            seoFit: string;
            toneAndStyle: string;
            verdict: string;
        };
        outline: {
            level: number;
            heading: string;
            notes: string;
        }[];
        mealPlanWeek?: {
            day: number;
            lunch: string;
            dinner: string;
        }[] | undefined;
    }>;
    reviewState: z.ZodObject<{
        titleApproved: z.ZodDefault<z.ZodBoolean>;
        secondaryKeywordsApproved: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        titleApproved: boolean;
        secondaryKeywordsApproved: boolean;
    }, {
        titleApproved?: boolean | undefined;
        secondaryKeywordsApproved?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    primaryKeyword: string;
    titleOptions: string[];
    contentFormat: "listicle" | "recipe_listicle" | "guide";
    keywordList: {
        keyword: string;
        searchVolume: number;
    }[];
    popularFoods: {
        name: string;
        category: string;
        reasoning: string;
        searchVolume?: number | undefined;
        matchedKeyword?: string | undefined;
    }[];
    serpResults: {
        rank: number;
        title: string;
        snippet: string;
        url: string;
        isForumOrSocial: boolean;
    }[];
    competitors: {
        rank: number;
        title: string;
        url: string;
        headings: {
            level: number;
            text: string;
        }[];
        semrushKeywords: {
            keyword: string;
            searchVolume: number;
        }[];
        markdown: string;
        metaDescription?: string | undefined;
    }[];
    competitorKeywordRollup: {
        keyword: string;
        searchVolume: number;
    }[];
    slugOptions: string[];
    secondaryKeywordOptions: {
        keyword: string;
        searchVolume: number;
    }[];
    selectedSecondaryKeywords: {
        keyword: string;
        searchVolume: number;
    }[];
    internalLinks: {
        anchorText: string;
        url: string;
        label: string;
    }[];
    mealRecommendations: {
        id: string;
        name: string;
        dietaryTags: string[];
        reason: string;
        url?: string | undefined;
        chef?: string | undefined;
        imageUrl?: string | undefined;
        description?: string | undefined;
        rating?: number | undefined;
        day?: number | undefined;
        slot?: "lunch" | "dinner" | undefined;
    }[];
    analysis: {
        persona: string;
        searchIntent: string;
        competitorSummary: string;
        seoOpportunities: string[];
        faqRecommendations: string[];
        mealPlacementSuggestions: string[];
        personaAnalysis: {
            audiences: string[];
            motivations: string[];
            painPoints: string[];
            desiredOutcomes: string[];
            coreQuestions: string[];
            unansweredQuestions: string[];
            topSecondaryKeywords: {
                keyword: string;
                searchVolume: number;
            }[];
        };
        competitorAnalysis: {
            competitors: {
                title: string;
                url: string;
                sections: {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }[];
            }[];
            topQuestionsAnswered: string[];
            commonSubtopics: string[];
            commonStructure: string[];
            syntaxPatterns: string[];
        };
        outlineDevelopment: {
            initialH2s: {
                source: string;
                heading: string;
                justification: string;
            }[];
            h2WithH3s: {
                heading: string;
                notes: string;
                h3s: string[];
            }[];
            faqPlan: string[];
            refinedOutlineNarrative: string[];
        };
        cookunityPositioning: {
            relationshipToArticle: string;
            uniqueValue: string[];
            seoOpportunityDetails: string[];
            mealIntegrationNotes: string[];
            ctaDirection: string;
        };
        evaluation: {
            comprehensiveness: string;
            structure: string;
            seoFit: string;
            toneAndStyle: string;
            verdict: string;
        };
        outline: {
            level: number;
            heading: string;
            notes: string;
        }[];
        mealPlanWeek?: {
            day: number;
            lunch: string;
            dinner: string;
        }[] | undefined;
    };
    reviewState: {
        titleApproved: boolean;
        secondaryKeywordsApproved: boolean;
    };
    keywordOverview?: {
        keyword: string;
        searchVolume: number;
        keywordDifficulty?: number | undefined;
        cpc?: number | undefined;
        competition?: number | undefined;
        resultsCount?: number | undefined;
    } | undefined;
    mainInternalLink?: {
        keyword: string;
        link: string;
    } | undefined;
    selectedTitle?: string | undefined;
    selectedSlug?: string | undefined;
}, {
    primaryKeyword: string;
    titleOptions: string[];
    keywordList: {
        keyword: string;
        searchVolume: number;
    }[];
    serpResults: {
        rank: number;
        title: string;
        snippet: string;
        url: string;
        isForumOrSocial: boolean;
    }[];
    competitors: {
        rank: number;
        title: string;
        url: string;
        headings: {
            level: number;
            text: string;
        }[];
        semrushKeywords: {
            keyword: string;
            searchVolume: number;
        }[];
        markdown: string;
        metaDescription?: string | undefined;
    }[];
    competitorKeywordRollup: {
        keyword: string;
        searchVolume: number;
    }[];
    secondaryKeywordOptions: {
        keyword: string;
        searchVolume: number;
    }[];
    internalLinks: {
        anchorText: string;
        url: string;
        label: string;
    }[];
    mealRecommendations: {
        id: string;
        name: string;
        reason: string;
        url?: string | undefined;
        chef?: string | undefined;
        dietaryTags?: string[] | undefined;
        imageUrl?: string | undefined;
        description?: string | undefined;
        rating?: number | undefined;
        day?: number | undefined;
        slot?: "lunch" | "dinner" | undefined;
    }[];
    analysis: {
        persona: string;
        searchIntent: string;
        competitorSummary: string;
        seoOpportunities: string[];
        faqRecommendations: string[];
        mealPlacementSuggestions: string[];
        personaAnalysis: {
            audiences?: string[] | undefined;
            motivations?: string[] | undefined;
            painPoints?: string[] | undefined;
            desiredOutcomes?: string[] | undefined;
            coreQuestions?: string[] | undefined;
            unansweredQuestions?: string[] | undefined;
            topSecondaryKeywords?: {
                keyword: string;
                searchVolume: number;
            }[] | undefined;
        };
        competitorAnalysis: {
            competitors?: {
                title: string;
                url: string;
                sections?: {
                    recommendation: string;
                    heading: string;
                    keyQuestion: string;
                    seoRationale: string;
                    shouldAdd: boolean;
                }[] | undefined;
            }[] | undefined;
            topQuestionsAnswered?: string[] | undefined;
            commonSubtopics?: string[] | undefined;
            commonStructure?: string[] | undefined;
            syntaxPatterns?: string[] | undefined;
        };
        outlineDevelopment: {
            initialH2s?: {
                source: string;
                heading: string;
                justification: string;
            }[] | undefined;
            h2WithH3s?: {
                heading: string;
                notes: string;
                h3s?: string[] | undefined;
            }[] | undefined;
            faqPlan?: string[] | undefined;
            refinedOutlineNarrative?: string[] | undefined;
        };
        cookunityPositioning: {
            relationshipToArticle: string;
            ctaDirection: string;
            uniqueValue?: string[] | undefined;
            seoOpportunityDetails?: string[] | undefined;
            mealIntegrationNotes?: string[] | undefined;
        };
        evaluation: {
            comprehensiveness: string;
            structure: string;
            seoFit: string;
            toneAndStyle: string;
            verdict: string;
        };
        outline: {
            level: number;
            heading: string;
            notes: string;
        }[];
        mealPlanWeek?: {
            day: number;
            lunch: string;
            dinner: string;
        }[] | undefined;
    };
    reviewState: {
        titleApproved?: boolean | undefined;
        secondaryKeywordsApproved?: boolean | undefined;
    };
    contentFormat?: "listicle" | "recipe_listicle" | "guide" | undefined;
    keywordOverview?: {
        keyword: string;
        searchVolume: number;
        keywordDifficulty?: number | undefined;
        cpc?: number | undefined;
        competition?: number | undefined;
        resultsCount?: number | undefined;
    } | undefined;
    mainInternalLink?: {
        keyword: string;
        link: string;
    } | undefined;
    popularFoods?: {
        name: string;
        category: string;
        reasoning: string;
        searchVolume?: number | undefined;
        matchedKeyword?: string | undefined;
    }[] | undefined;
    selectedTitle?: string | undefined;
    slugOptions?: string[] | undefined;
    selectedSlug?: string | undefined;
    selectedSecondaryKeywords?: {
        keyword: string;
        searchVolume: number;
    }[] | undefined;
}>;
export type OutlinePackage = z.infer<typeof outlinePackageSchema>;
export declare const draftSchema: z.ZodObject<{
    id: z.ZodString;
    topicId: z.ZodString;
    briefId: z.ZodString;
    promptVersionId: z.ZodString;
    titleTagOptions: z.ZodArray<z.ZodString, "many">;
    metaDescriptionOptions: z.ZodArray<z.ZodString, "many">;
    slugRecommendation: z.ZodString;
    h1: z.ZodString;
    intro: z.ZodString;
    keyTakeaways: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    sections: z.ZodArray<z.ZodObject<{
        heading: z.ZodString;
        level: z.ZodNumber;
        body: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        level: number;
        heading: string;
        body: string;
    }, {
        level: number;
        heading: string;
        body: string;
    }>, "many">;
    faq: z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        answer: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        question: string;
        answer: string;
    }, {
        question: string;
        answer: string;
    }>, "many">;
    schemaSuggestions: z.ZodArray<z.ZodString, "many">;
    ctaSuggestions: z.ZodArray<z.ZodString, "many">;
    editorNotes: z.ZodArray<z.ZodString, "many">;
    targetKeywords: z.ZodArray<z.ZodString, "many">;
    competitorNotes: z.ZodArray<z.ZodString, "many">;
    revisionChecklist: z.ZodArray<z.ZodString, "many">;
    imagePlan: z.ZodOptional<z.ZodObject<{
        headerImageTerm: z.ZodOptional<z.ZodString>;
        sectionImages: z.ZodDefault<z.ZodArray<z.ZodObject<{
            header: z.ZodString;
            searchTerm: z.ZodString;
            imageUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            header: string;
            searchTerm: string;
            imageUrl?: string | undefined;
        }, {
            header: string;
            searchTerm: string;
            imageUrl?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        sectionImages: {
            header: string;
            searchTerm: string;
            imageUrl?: string | undefined;
        }[];
        headerImageTerm?: string | undefined;
    }, {
        headerImageTerm?: string | undefined;
        sectionImages?: {
            header: string;
            searchTerm: string;
            imageUrl?: string | undefined;
        }[] | undefined;
    }>>;
    publishPackage: z.ZodOptional<z.ZodObject<{
        slug: z.ZodString;
        description: z.ZodString;
        blocks: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
        mealCarouselInsertions: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        slug: string;
        blocks: Record<string, unknown>[];
        mealCarouselInsertions: number;
    }, {
        description: string;
        slug: string;
        blocks?: Record<string, unknown>[] | undefined;
        mealCarouselInsertions?: number | undefined;
    }>>;
    html: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    topicId: string;
    sections: {
        level: number;
        heading: string;
        body: string;
    }[];
    briefId: string;
    promptVersionId: string;
    titleTagOptions: string[];
    metaDescriptionOptions: string[];
    slugRecommendation: string;
    h1: string;
    intro: string;
    keyTakeaways: string[];
    faq: {
        question: string;
        answer: string;
    }[];
    schemaSuggestions: string[];
    ctaSuggestions: string[];
    editorNotes: string[];
    targetKeywords: string[];
    competitorNotes: string[];
    revisionChecklist: string[];
    html: string;
    imagePlan?: {
        sectionImages: {
            header: string;
            searchTerm: string;
            imageUrl?: string | undefined;
        }[];
        headerImageTerm?: string | undefined;
    } | undefined;
    publishPackage?: {
        description: string;
        slug: string;
        blocks: Record<string, unknown>[];
        mealCarouselInsertions: number;
    } | undefined;
}, {
    id: string;
    createdAt: string;
    topicId: string;
    sections: {
        level: number;
        heading: string;
        body: string;
    }[];
    briefId: string;
    promptVersionId: string;
    titleTagOptions: string[];
    metaDescriptionOptions: string[];
    slugRecommendation: string;
    h1: string;
    intro: string;
    faq: {
        question: string;
        answer: string;
    }[];
    schemaSuggestions: string[];
    ctaSuggestions: string[];
    editorNotes: string[];
    targetKeywords: string[];
    competitorNotes: string[];
    revisionChecklist: string[];
    html: string;
    keyTakeaways?: string[] | undefined;
    imagePlan?: {
        headerImageTerm?: string | undefined;
        sectionImages?: {
            header: string;
            searchTerm: string;
            imageUrl?: string | undefined;
        }[] | undefined;
    } | undefined;
    publishPackage?: {
        description: string;
        slug: string;
        blocks?: Record<string, unknown>[] | undefined;
        mealCarouselInsertions?: number | undefined;
    } | undefined;
}>;
export type Draft = z.infer<typeof draftSchema>;
export declare const optimizationTaskSchema: z.ZodObject<{
    id: z.ZodString;
    topicId: z.ZodOptional<z.ZodString>;
    publicationId: z.ZodString;
    type: z.ZodEnum<["refresh_article", "expand_cluster", "improve_ctr", "strengthen_internal_links", "merge_content", "add_faq"]>;
    priority: z.ZodEnum<["low", "medium", "high", "critical"]>;
    reason: z.ZodString;
    actions: z.ZodArray<z.ZodString, "many">;
    metricsContext: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "refresh_article" | "expand_cluster" | "improve_ctr" | "strengthen_internal_links" | "merge_content" | "add_faq";
    id: string;
    createdAt: string;
    reason: string;
    publicationId: string;
    priority: "low" | "medium" | "high" | "critical";
    actions: string[];
    metricsContext: Record<string, unknown>;
    topicId?: string | undefined;
}, {
    type: "refresh_article" | "expand_cluster" | "improve_ctr" | "strengthen_internal_links" | "merge_content" | "add_faq";
    id: string;
    createdAt: string;
    reason: string;
    publicationId: string;
    priority: "low" | "medium" | "high" | "critical";
    actions: string[];
    metricsContext: Record<string, unknown>;
    topicId?: string | undefined;
}>;
export type OptimizationTask = z.infer<typeof optimizationTaskSchema>;
export type AuditActor = "system" | "reviewer" | "publisher";
export interface QueueJobPayload {
    runId: string;
    topicId?: string;
    publicationId?: string;
}
export declare const workflowEventSchema: z.ZodObject<{
    runId: z.ZodString;
    entityId: z.ZodString;
    entityType: z.ZodString;
    fromState: z.ZodOptional<z.ZodString>;
    toState: z.ZodString;
    agent: z.ZodEnum<["keyword_discovery", "topic_prioritization", "content_brief_outline", "article_drafting", "editorial_qa", "publishing_strapi", "performance_monitoring_refresh"]>;
    approvedByHuman: z.ZodDefault<z.ZodBoolean>;
    occurredAt: z.ZodString;
    details: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    runId: string;
    entityId: string;
    entityType: string;
    toState: string;
    agent: "keyword_discovery" | "topic_prioritization" | "content_brief_outline" | "article_drafting" | "editorial_qa" | "publishing_strapi" | "performance_monitoring_refresh";
    approvedByHuman: boolean;
    occurredAt: string;
    details: Record<string, unknown>;
    fromState?: string | undefined;
}, {
    runId: string;
    entityId: string;
    entityType: string;
    toState: string;
    agent: "keyword_discovery" | "topic_prioritization" | "content_brief_outline" | "article_drafting" | "editorial_qa" | "publishing_strapi" | "performance_monitoring_refresh";
    occurredAt: string;
    fromState?: string | undefined;
    approvedByHuman?: boolean | undefined;
    details?: Record<string, unknown> | undefined;
}>;
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
