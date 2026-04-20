import { createProviders } from "@cookunity-seo-agent/integrations";
import { loadBrandVoice, promptTemplates } from "@cookunity-seo-agent/prompts";
import type { ContentBrief, ContentFormatType, OutlinePackage, OpportunityPath, PopularFood } from "@cookunity-seo-agent/shared";

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
    const contentFormat = this.inferContentFormat(topic.keyword);
    const popularFoods = this.buildPopularFoods(topic.keyword, contentFormat, secondaryKeywordOptions);

    const mealFilters = await this.providers.workflowResearch.determineMealFilters(topic.keyword);
    const meals = (await this.providers.workflowResearch.fetchMeals(mealFilters)).slice(0, 12);
    const internalLinkCandidates = await this.providers.workflowResearch.fetchInternalLinkCandidates(topic.keyword);

    const titleOptions = this.buildTitleOptions(topic.keyword, competitors.map((competitor) => competitor.title), topic.path ?? "blog");
    const selectedTitle = titleOptions[0] ?? this.titleCase(topic.keyword);
    const slugOptions = this.buildSlugOptions(topic.keyword, selectedTitle, competitors.map((competitor) => competitor.url));
    const selectedSlug = slugOptions[0] ?? topic.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const selectedSecondaryKeywords = secondaryKeywordOptions.slice(0, 5);
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
        reason:
          mealFilters.length > 0
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
        mealPlacementSuggestions: [
          "Use one meal recommendation near the intro to ground the category in real menu examples",
          "Place 2-3 meal references in the comparison or examples section",
          "Use a final meal CTA near the conclusion",
        ],
        outline: [
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
        ],
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
