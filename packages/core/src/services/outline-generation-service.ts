import { createProviders } from "@cookunity-seo-agent/integrations";
import { loadBrandVoice, promptTemplates } from "@cookunity-seo-agent/prompts";
import {
  buildCookunitySevenDayMealPlan,
  flattenMealPlanDays,
  searchCookunityMeals,
  type ContentBrief,
  type ContentFormatType,
  type OutlinePackage,
  type OpportunityPath,
  type PopularFood,
} from "@cookunity-seo-agent/shared";

export class OutlineGenerationService {
  private providers = createProviders();

  async generate(topic: {
    id: string;
    keyword: string;
    recommendation: string;
    path?: OpportunityPath;
    intent?: string;
    pillarPageUrl?: string;
    mainInternalLink?: string;
    mainInternalLinkKeyword?: string;
  }): Promise<ContentBrief> {
    const brandVoice = loadBrandVoice();
    const prompt = promptTemplates.outlineGeneration;
    if (!prompt) {
      throw new Error("Missing outline generation prompt template.");
    }

    const [mainInternalLink, keywordOverview] = await Promise.all([
      this.providers.workflowResearch.identifyMainInternalLink(topic.keyword),
      this.providers.workflowResearch.fetchKeywordOverview(topic.keyword),
    ]);

    const organicResults = await this.providers.workflowResearch.searchOrganicResults(topic.keyword);
    const classified = await Promise.all(
      organicResults.map(async (result) => ({
        ...result,
        isForumOrSocial: await this.providers.workflowResearch.classifyForumOrSocial(result),
      })),
    );
    const topCompetitors = classified.filter((result) => !result.isForumOrSocial).slice(0, 3);
    const competitors = await Promise.all(
      topCompetitors.map(async (result) => {
        const scraped = await this.providers.workflowResearch.scrapeMarkdown(result.url);
        const headings = await this.providers.workflowResearch.extractHeadings(scraped.markdown);
        const semrushKeywords = await this.providers.workflowResearch.fetchCompetitorKeywords(result.url);
        return {
          rank: result.rank,
          url: result.url,
          title: scraped.title ?? result.title,
          metaDescription: scraped.metaDescription ?? result.snippet,
          headings,
          semrushKeywords,
          markdown: scraped.markdown,
        };
      }),
    );

    const rollupMap = new Map<string, number>();
    for (const competitor of competitors) {
      for (const keyword of competitor.semrushKeywords) {
        const current = rollupMap.get(keyword.keyword) ?? 0;
        rollupMap.set(keyword.keyword, Math.max(current, keyword.searchVolume));
      }
    }
    const competitorKeywordRollup = [...rollupMap.entries()]
      .map(([keyword, searchVolume]) => ({ keyword, searchVolume }))
      .sort((left, right) => right.searchVolume - left.searchVolume);

    const secondaryKeywordOptions = (await this.providers.workflowResearch.fetchSecondaryKeywords(topic.keyword))
      .sort((left, right) => right.searchVolume - left.searchVolume)
      .slice(0, 20);
    const selectedSecondaryKeywords = secondaryKeywordOptions.slice(0, 5);
    const contentFormat = this.inferContentFormat(topic.keyword);
    const popularFoods = this.buildPopularFoods(topic.keyword, contentFormat, secondaryKeywordOptions);

    const mealFilters = await this.providers.workflowResearch.determineMealFilters(topic.keyword);
    const isMealPlanTopic = topic.keyword.toLowerCase().includes("meal plan");
    const mealPlanDays = isMealPlanTopic
      ? buildCookunitySevenDayMealPlan(topic.keyword, selectedSecondaryKeywords.map((item) => item.keyword))
      : [];
    const meals = isMealPlanTopic
      ? flattenMealPlanDays(topic.keyword, selectedSecondaryKeywords.map((item) => item.keyword))
      : searchCookunityMeals({
          keyword: topic.keyword,
          secondaryKeywords: selectedSecondaryKeywords.map((item) => item.keyword),
          filters: mealFilters,
          count: 12,
        }).map((meal) => ({
          id: meal.id,
          name: meal.name,
          ...(meal.chef ? { chef: meal.chef } : {}),
          dietaryTags: meal.dietaryTags,
          url: meal.url,
          imageUrl: meal.imageUrl,
          description: meal.description,
          rating: meal.rating,
        }));
    const internalLinkCandidates = await this.providers.workflowResearch.fetchInternalLinkCandidates(topic.keyword);

    const titleOptions = this.buildTitleOptions(topic.keyword, competitors.map((competitor) => competitor.title), topic.path ?? "blog");
    const selectedTitle = titleOptions[0] ?? this.titleCase(topic.keyword);
    const slugOptions = this.buildSlugOptions(topic.keyword, selectedTitle, competitors.map((competitor) => competitor.url));
    const selectedSlug = slugOptions[0] ?? topic.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const internalLinks = [
      ...(topic.pillarPageUrl
        ? [
            {
              label: "Pillar page",
              url: topic.pillarPageUrl,
              anchorText: "prepared meal delivery",
            },
          ]
        : []),
      {
        label: "Main internal link",
        url: (topic.mainInternalLink ?? mainInternalLink.link) || "/blog/meal-delivery-vs-meal-kits",
        anchorText: (topic.mainInternalLinkKeyword ?? mainInternalLink.keyword) || "meal delivery vs meal kits",
      },
    ];

    const personaAnalysis = this.buildPersonaAnalysis(topic.keyword, topic.path ?? "blog", selectedSecondaryKeywords, contentFormat);
    const competitorAnalysis = this.buildCompetitorAnalysis(competitors, topic.keyword, contentFormat);
    const mealPlacementSuggestions = isMealPlanTopic
      ? [
          "Use the seven-day lunch and dinner plan as the center of the article, not as an afterthought",
          "Explain why each lunch and dinner pairing fits the training or weekday context",
          "Bridge from the day-by-day plan into menu exploration near the conclusion",
        ]
      : [
          "Use one meal recommendation near the intro to ground the category in real menu examples",
          "Place 2-3 meal references in the comparison or examples section",
          "Use a final meal CTA near the conclusion",
        ];
    const outline = [
      { heading: "Key takeaways", level: 2, notes: "Open with quick decision-ready context." },
      ...(contentFormat !== "guide"
        ? popularFoods.slice(0, Math.max(8, Math.min(popularFoods.length, 12))).map((food, index) => ({
            heading: `${index + 1}. ${this.titleCase(food.name)}`,
            level: 2,
            notes: `${food.reasoning}${food.searchVolume ? ` Prioritize because it aligns with ${food.searchVolume.toLocaleString()} monthly searches.` : ""}`,
          }))
        : [
            { heading: `What searchers really want from ${topic.keyword}`, level: 2, notes: "Reflect the dominant SERP intent." },
            { heading: "What competitors cover well and where they stay shallow", level: 2, notes: "Summarize gaps from the top 3 pages." },
            { heading: "How CookUnity should frame the category", level: 2, notes: "Tie to business path and brand positioning." },
            { heading: "Examples, comparisons, or menu proof points", level: 2, notes: "Use meal recommendations and internal links." },
          ]),
      { heading: "Frequently asked questions", level: 2, notes: "Answer the top PAA or objection-driven follow-ups." },
      { heading: "Bottom line", level: 2, notes: "Close with the right CTA for the path." },
    ];
    const outlineDevelopment = this.buildOutlineDevelopment(topic.keyword, contentFormat, outline);
    const cookunityPositioning = this.buildCookunityPositioning(topic.keyword, topic.path ?? "blog", meals, mealPlacementSuggestions);
    const evaluation = this.buildEvaluation(contentFormat);

    const outlinePackage: OutlinePackage = {
      primaryKeyword: topic.keyword,
      contentFormat,
      keywordOverview,
      ...(mainInternalLink.link ? { mainInternalLink } : {}),
      keywordList: secondaryKeywordOptions.slice(0, 10),
      popularFoods,
      serpResults: classified,
      competitors,
      competitorKeywordRollup,
      titleOptions,
      selectedTitle,
      slugOptions,
      selectedSlug,
      secondaryKeywordOptions,
      selectedSecondaryKeywords,
      internalLinks,
      mealRecommendations: meals.map((meal) => ({
        id: meal.id,
        name: meal.name,
        ...(meal.chef ? { chef: meal.chef } : {}),
        dietaryTags: meal.dietaryTags,
        ...(meal.url ? { url: meal.url } : {}),
        ...(meal.imageUrl ? { imageUrl: meal.imageUrl } : {}),
        ...(meal.description ? { description: meal.description } : {}),
        ...(typeof meal.rating === "number" ? { rating: meal.rating } : {}),
        ...("day" in meal && typeof meal.day === "number" ? { day: meal.day } : {}),
        ...("slot" in meal && (meal as { slot?: "lunch" | "dinner" }).slot ? { slot: (meal as { slot?: "lunch" | "dinner" }).slot } : {}),
        reason:
          "reason" in meal && typeof (meal as { reason?: string }).reason === "string"
            ? (meal as { reason: string }).reason
            : mealFilters.length > 0
              ? `Matches dietary filters: ${mealFilters.join(", ")}`
              : "Fits the article naturally as an internal meal recommendation.",
      })),
      analysis: {
        persona: topic.path === "landing_page" ? "High-intent shopper comparing direct trial options" : "Reader looking for helpful guidance before signing up",
        searchIntent:
          topic.intent ??
          (topic.path === "landing_page"
            ? "Commercial comparison and direct-trial consideration"
            : "Informational discovery with capture potential"),
        competitorSummary: this.buildCompetitorSummary(competitors),
        seoOpportunities: [
          "Cover the prepared vs kit distinction clearly when relevant",
          "Use richer structure than competing roundups",
          "Include concrete internal links and meal examples tied to search intent",
          ...(contentFormat !== "guide" ? ["Ensure the listicle count matches the promise in the title"] : []),
        ],
        faqRecommendations: [
          `What should you look for in ${topic.keyword}?`,
          `How does ${topic.keyword} compare with meal kits?`,
          `Is ${topic.keyword} worth it for busy weekdays?`,
        ],
        mealPlacementSuggestions,
        ...(mealPlanDays.length
          ? {
              mealPlanWeek: mealPlanDays.map((day) => ({
                day: day.day,
                lunch: day.lunch.name,
                dinner: day.dinner.name,
              })),
            }
          : {}),
        personaAnalysis,
        competitorAnalysis,
        outlineDevelopment,
        cookunityPositioning,
        evaluation,
        outline,
      },
      reviewState: {
        titleApproved: false,
        secondaryKeywordsApproved: false,
      },
    };

    return {
      id: `brief_${topic.id}`,
      topicId: topic.id,
      primaryKeyword: topic.keyword,
      secondaryKeywords: selectedSecondaryKeywords.map((item) => item.keyword),
      titleOptions,
      intentSummary:
        outlinePackage.analysis.searchIntent,
      differentiators: [
        "Chef-driven quality",
        "Prepared meal convenience",
        "Cuisine and dietary variety",
      ],
      recommendedInternalLinks: internalLinks.map((link, index) => ({
        targetId: `internal_link_${index + 1}`,
        targetUrl: link.url,
        anchorText: link.anchorText,
        rationale: `Supports ${link.label.toLowerCase()} placement in the outline package.`,
      })).concat(
        internalLinkCandidates.slice(0, 3).map((link, index) => ({
          targetId: `kb_internal_link_${index + 1}`,
          targetUrl: link.url,
          anchorText: link.title,
          rationale: "Semantic internal link candidate from the CookUnity sitemap knowledge base.",
        })),
      ),
      faqCandidates: outlinePackage.analysis.faqRecommendations,
      faqSchemaDraft: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
      },
      requiredSources: [
        "Brand-approved product facts",
        "Current menu experience and dietary filter details",
        "Competitor SERP pages and heading structures",
      ],
      factCheckChecklist: [
        "Validate product and operational claims",
        "Remove unsupported medical claims",
        "Confirm link targets",
        "Confirm title and secondary keyword selections before drafting",
      ],
      ctaRecommendations:
        topic.path === "landing_page"
          ? ["Start your CookUnity trial", "See this week's menu"]
          : ["Get menu updates by email", "Download the comparison guide"],
      briefJson: {
        promptTemplateId: prompt.id,
        promptVersion: prompt.version,
        brandVoicePreview: brandVoice.slice(0, 160),
        recommendation: topic.recommendation,
        path: topic.path ?? "blog",
        outlinePackage,
        keywordOverview,
        ...(mainInternalLink.link ? { mainInternalLink } : {}),
      },
    };
  }

  private buildTitleOptions(keyword: string, competitorTitles: string[], path: OpportunityPath) {
    const keywordTitle = this.titleCase(keyword);
    const leadingCompetitorVerb = competitorTitles[0]?.split(":")[0]?.slice(0, 56) ?? keywordTitle;
    return [
      path === "landing_page"
        ? `Best ${keywordTitle} Without the Kit Churn`
        : `${keywordTitle}: What to Know Before You Order`,
      path === "landing_page"
        ? `Why CookUnity Is a Better ${keywordTitle} Option`
        : `How to Choose ${keywordTitle}`,
      `${leadingCompetitorVerb} | CookUnity Perspective`,
    ];
  }

  private buildSlugOptions(keyword: string, selectedTitle: string, competitorUrls: string[]) {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const competitorPatterns = competitorUrls
      .map((url) => url.split("/").filter(Boolean).pop())
      .filter((value): value is string => Boolean(value));
    return [normalize(selectedTitle), normalize(keyword), ...competitorPatterns.slice(0, 2)].filter(
      (value, index, all) => value && all.indexOf(value) === index,
    );
  }

  private buildCompetitorSummary(
    competitors: Array<{
      title: string;
      url: string;
      headings: Array<{ level: number; text: string }>;
    }>,
  ) {
    return competitors
      .map(
        (competitor) =>
          `${competitor.title} (${competitor.url}) focuses on ${competitor.headings
            .slice(0, 4)
            .map((heading) => heading.text)
            .join(", ")}.`,
      )
      .join(" ");
  }

  private buildPersonaAnalysis(
    keyword: string,
    path: OpportunityPath,
    selectedSecondaryKeywords: Array<{ keyword: string; searchVolume: number }>,
    contentFormat: ContentFormatType,
  ) {
    const isCommercial = path === "landing_page";
    const keywordTitle = this.titleCase(keyword);
    return {
      audiences: isCommercial
        ? ["High-intent shoppers comparing meal solutions", "Readers close to trial who need confidence on fit, value, and convenience"]
        : ["Searchers trying to understand the topic in practical terms", "Readers deciding whether the topic fits their weekday routine"],
      motivations: isCommercial
        ? [`Evaluate whether ${keyword} is worth trying`, "Reduce friction before starting a subscription or trial"]
        : [`Understand what ${keyword} means in real life`, "Find practical guidance they can actually use this week"],
      painPoints: isCommercial
        ? ["Skepticism about convenience claims", "Concern that the solution will not fit routines or dietary needs"]
        : ["Generic content that does not answer the real question", "Need for clarity without having to decode jargon or trend language"],
      desiredOutcomes: isCommercial
        ? ["A clear reason to choose CookUnity over generic alternatives", "A realistic sense of how the product fits daily life"]
        : ["A direct answer, clear structure, and useful next steps", "Enough confidence to move from research into menu exploration or email capture"],
      coreQuestions: [
        `What does ${keywordTitle} actually mean?`,
        `What matters most when evaluating ${keywordTitle}?`,
        `How should someone start or apply ${keywordTitle} without overcomplicating it?`,
      ],
      unansweredQuestions: [
        `How does ${keywordTitle} fit different diet or lifestyle constraints?`,
        "Which examples or meals make the topic feel concrete instead of theoretical?",
        ...(contentFormat !== "guide" ? ["What belongs on the list, and why does each item deserve to be there?"] : []),
      ],
      topSecondaryKeywords: selectedSecondaryKeywords.slice(0, 10),
    };
  }

  private buildCompetitorAnalysis(
    competitors: Array<{
      title: string;
      url: string;
      headings: Array<{ level: number; text: string }>;
    }>,
    keyword: string,
    contentFormat: ContentFormatType,
  ) {
    const topQuestionsAnswered = this.uniqueStrings(
      competitors.flatMap((competitor) =>
        competitor.headings
          .filter((heading) => heading.level <= 3)
          .slice(0, 8)
          .map((heading) => this.inferQuestionFromHeading(heading.text, keyword)),
      ),
    ).slice(0, 12);

    const commonSubtopics = this.uniqueStrings([
      ...topQuestionsAnswered,
      contentFormat === "guide" ? `How to start ${keyword}` : `How to choose the best ${keyword}`,
      "Benefits, tradeoffs, and practical fit",
      "Examples that make the topic more concrete",
    ]).slice(0, 10);

    return {
      topQuestionsAnswered,
      commonSubtopics,
      commonStructure: [
        "Definition or framing first",
        "Benefits, use cases, or comparison criteria",
        "Implementation guidance or recommendation body",
        "FAQ and close",
      ],
      syntaxPatterns: [
        '"What is..." or "How to..." headers near the top',
        "Benefit-led H2s and action-oriented H3s",
        "FAQ-style follow-up questions at the end",
      ],
      competitors: competitors.map((competitor) => ({
        title: competitor.title,
        url: competitor.url,
        sections: competitor.headings
          .filter((heading) => heading.level <= 3)
          .slice(0, 10)
          .map((heading) => ({
            heading: heading.text,
            keyQuestion: this.inferQuestionFromHeading(heading.text, keyword),
            seoRationale: this.inferSeoRationale(heading.text, contentFormat),
            shouldAdd: true,
            recommendation: `Cover a similar concept, but make it more concrete and more specific to ${keyword}.`,
          })),
      })),
    };
  }

  private buildOutlineDevelopment(
    keyword: string,
    contentFormat: ContentFormatType,
    outline: Array<{ heading: string; level: number; notes: string }>,
  ) {
    const initialH2s = outline
      .filter((item) => item.level === 2)
      .map((item) => ({
        heading: item.heading,
        source: item.heading === "Bottom line" ? "conclusion" : item.heading === "Key takeaways" ? "AEO opener" : "competitor + opportunity",
        justification: item.notes,
      }));

    return {
      initialH2s,
      h2WithH3s: initialH2s.map((item) => ({
        heading: item.heading,
        notes: item.justification,
        h3s: this.buildH3Suggestions(item.heading, keyword, contentFormat),
      })),
      faqPlan: [
        `What should readers know first about ${keyword}?`,
        `How do you make ${keyword} work in real life?`,
        `What is the most common mistake people make with ${keyword}?`,
      ],
      refinedOutlineNarrative: [
        "Start with answer-first framing and key takeaways.",
        "Move from definition or criteria into practical evaluation.",
        "Use examples and menu proof points before the FAQ and close.",
      ],
    };
  }

  private buildCookunityPositioning(
    keyword: string,
    path: OpportunityPath,
    meals: Array<{ name: string }>,
    mealPlacementSuggestions: string[],
  ) {
    return {
      relationshipToArticle:
        path === "landing_page"
          ? `Position CookUnity as the strongest direct-trial option for readers evaluating ${keyword}.`
          : `Use CookUnity to make ${keyword} feel actionable, not theoretical, and bridge from education into capture or menu exploration.`,
      uniqueValue: [
        "Chef-led quality instead of generic convenience copy",
        "Prepared-meal convenience without kit-style prep burden",
        "Menu breadth across cuisines and dietary preferences",
      ],
      seoOpportunityDetails: [
        `Answer the core ${keyword} question faster than competitors.`,
        "Use concrete examples, not generic category filler.",
        "Support AEO/LLM retrieval with direct statements and skimmable takeaways.",
      ],
      mealIntegrationNotes: [
        ...mealPlacementSuggestions,
        ...meals.slice(0, 3).map((meal) => `Use ${meal.name} where it naturally reinforces the topic.`),
      ],
      ctaDirection:
        path === "landing_page"
          ? "Move into a direct menu or trial CTA once the fit feels obvious."
          : "Close with a light capture CTA and a menu bridge rather than a hard sell.",
    };
  }

  private buildEvaluation(contentFormat: ContentFormatType) {
    return {
      comprehensiveness: "The analysis covers intent, competitor headers, common questions, SEO opportunities, and the refined outline path.",
      structure: "The sequence moves from direct answer to practical evaluation, then into examples, FAQs, and a close.",
      seoFit: `The outline is optimized for ${contentFormat === "guide" ? "guide-style informational intent" : "list-fulfillment and recommendation intent"} while preserving answer-first structure.`,
      toneAndStyle: "The brief should sound premium, human, and practical rather than like a generic SEO content plan.",
      verdict: "Use this analysis package as the pre-brief foundation. The brief should feel like the output of a structured editorial analysis, not just a keyword expansion.",
    };
  }

  private buildH3Suggestions(heading: string, keyword: string, contentFormat: ContentFormatType) {
    const normalized = heading.toLowerCase();
    if (normalized.includes("key takeaways")) return [];
    if (normalized.includes("frequently asked")) return [`What should readers know first about ${keyword}?`, `How should someone apply ${keyword} in real life?`];
    if (contentFormat !== "guide" && /^\d+\./.test(heading)) {
      return ["Why it belongs on the list", "Who it fits best", "What to know before choosing it"];
    }
    if (normalized.includes("compare")) return ["Quality and taste", "Convenience and repeatability", "How it fits a busy schedule"];
    if (normalized.includes("start") || normalized.includes("how")) return ["What to do first", "How to keep it realistic", "Where CookUnity fits"];
    return [];
  }

  private inferQuestionFromHeading(heading: string, keyword: string) {
    const normalized = heading.trim();
    if (/^what\b/i.test(normalized) || /\?$/i.test(normalized)) return normalized;
    if (/^how\b/i.test(normalized)) return normalized;
    return `How does ${normalized.toLowerCase()} relate to ${keyword}?`;
  }

  private inferSeoRationale(heading: string, contentFormat: ContentFormatType) {
    const normalized = heading.toLowerCase();
    if (normalized.includes("what is")) return "Captures definition-first intent and aligns with answer-first retrieval.";
    if (normalized.includes("benefit") || normalized.includes("why")) return "Covers the value case readers use to judge relevance.";
    if (normalized.includes("how")) return "Targets practical implementation queries and improves article usefulness.";
    if (contentFormat !== "guide" && /^\d+\./.test(heading)) return "Helps fulfill the promised list count with scannable, item-specific sections.";
    return "Supports topical coverage and strengthens section-level relevance.";
  }

  private uniqueStrings(values: string[]) {
    return values.filter((value, index) => value && values.indexOf(value) === index);
  }

  private inferContentFormat(keyword: string): ContentFormatType {
    const normalized = keyword.toLowerCase();
    if (/\brecipe|recipes\b/.test(normalized)) return "recipe_listicle";
    if (/\bbest|ideas|foods|dishes|meals|types|examples\b/.test(normalized)) return "listicle";
    return "guide";
  }

  private buildPopularFoods(
    keyword: string,
    contentFormat: ContentFormatType,
    keywordOptions: Array<{ keyword: string; searchVolume: number }>,
  ): PopularFood[] {
    if (contentFormat === "guide") {
      return [];
    }

    const seedFoods = keywordOptions.slice(0, 12).map((item, index) => ({
      name: item.keyword.replace(/\b(best|guide|delivery|ideas|near me)\b/gi, "").replace(/\s+/g, " ").trim() || `option ${index + 1}`,
      category: contentFormat === "recipe_listicle" ? "recipes" : "popular choices",
      reasoning: "Appears repeatedly in the keyword set and supports listicle completeness.",
      matchedKeyword: item.keyword,
      searchVolume: item.searchVolume,
    }));

    if (seedFoods.length) {
      return seedFoods;
    }

    return [
      {
        name: keyword,
        category: contentFormat === "recipe_listicle" ? "recipes" : "popular choices",
        reasoning: "Fallback food/topic list generated from the primary keyword.",
      },
    ];
  }

  private titleCase(value: string): string {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
