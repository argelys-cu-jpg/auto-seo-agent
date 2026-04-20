import type {
  AhrefsProvider,
  AnalyticsProvider,
  GscProvider,
  KeywordDiscoveryRecord,
  PerformanceRecord,
  WorkflowResearchProvider,
  ReviewDocumentPayload,
  ReviewDocumentProvider,
  ReviewDocumentRecord,
  SerpProvider,
  StrapiArticlePayload,
  StrapiContentModelConfig,
  StrapiProvider,
  TrendsProvider,
} from "../providers/types";
import { identifyMainInternalLink } from "../providers/internal-link-catalog";
import { getStrapiContentModelConfig } from "../providers/strapi-mapper";

const mockKeywords: KeywordDiscoveryRecord[] = [
  {
    keyword: "healthy prepared meal delivery",
    source: "ahrefs",
    searchVolume: 5400,
    keywordDifficulty: 21,
    trendVelocity: 18,
    intent: "commercial investigation",
    notes: "Strong fit for consideration-stage content.",
  },
  {
    keyword: "best prepared meal delivery for weight loss",
    source: "serp",
    searchVolume: 2400,
    keywordDifficulty: 28,
    trendVelocity: 11,
    intent: "comparison",
    notes: "YMYL-adjacent. Requires extra human review.",
  },
  {
    keyword: "mediterranean prepared meals",
    source: "trends",
    searchVolume: 1900,
    keywordDifficulty: 17,
    trendVelocity: 24,
    intent: "informational + commercial",
  },
];

export class MockAhrefsProvider implements AhrefsProvider {
  async discoverKeywords(): Promise<KeywordDiscoveryRecord[]> {
    return mockKeywords.filter((item) => item.source === "ahrefs");
  }
}

export class MockGscProvider implements GscProvider {
  async discoverContentDecay(): Promise<KeywordDiscoveryRecord[]> {
    return [
      {
        keyword: "prepared meal delivery",
        source: "gsc",
        searchVolume: 12000,
        keywordDifficulty: 42,
        trendVelocity: -12,
        intent: "category",
        notes: "Existing page losing average position over 28 days.",
      },
    ];
  }

  async fetchPerformance(): Promise<PerformanceRecord[]> {
    return [
      {
        url: "https://www.cookunity.com/blog/healthy-prepared-meal-delivery-guide",
        query: "healthy prepared meal delivery",
        impressions: 14000,
        clicks: 224,
        ctr: 0.016,
        averagePosition: 8.3,
        conversions: 19,
      },
    ];
  }
}

export class MockTrendsProvider implements TrendsProvider {
  async discoverRisingTopics(): Promise<KeywordDiscoveryRecord[]> {
    return mockKeywords.filter((item) => item.source === "trends");
  }
}

export class MockSerpProvider implements SerpProvider {
  async discoverQuestions(): Promise<KeywordDiscoveryRecord[]> {
    return [
      {
        keyword: "are prepared meal delivery services worth it",
        source: "serp",
        searchVolume: 880,
        keywordDifficulty: 14,
        trendVelocity: 8,
        intent: "question",
        notes: "Fits FAQ or comparison article support content.",
      },
    ];
  }
}

export class MockAnalyticsProvider implements AnalyticsProvider {
  async fetchConversions(urls: string[]): Promise<Array<{ url: string; conversions: number }>> {
    return urls.map((url) => ({
      url,
      conversions: url.includes("healthy-prepared") ? 19 : 7,
    }));
  }
}

export class MockReviewDocumentProvider implements ReviewDocumentProvider {
  async createDocument(payload: ReviewDocumentPayload): Promise<ReviewDocumentRecord> {
    const slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      id: `mock_doc_${slug}`,
      title: payload.title,
      url: `https://docs.mock.local/document/d/${slug}`,
      provider: "mock",
    };
  }

  async updateDocument(documentId: string, payload: ReviewDocumentPayload): Promise<ReviewDocumentRecord> {
    return {
      id: documentId,
      title: payload.title,
      url: `https://docs.mock.local/document/d/${documentId}`,
      provider: "mock",
    };
  }
}

export class MockWorkflowResearchProvider implements WorkflowResearchProvider {
  async identifyMainInternalLink(keyword: string) {
    return identifyMainInternalLink(keyword);
  }

  async fetchKeywordOverview(keyword: string) {
    return {
      keyword,
      searchVolume: 1900,
      cpc: 2.45,
      competition: 0.64,
      keywordDifficulty: 23,
      resultsCount: 1280000,
    };
  }

  async searchOrganicResults(keyword: string) {
    return [
      {
        rank: 1,
        title: `${keyword} guide - Serious Eats`,
        snippet: "An editorial guide covering the topic in depth.",
        url: `https://example.com/${keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-guide`,
      },
      {
        rank: 2,
        title: `${keyword} discussion - Reddit`,
        snippet: "Forum discussion about the keyword.",
        url: "https://www.reddit.com/r/food/",
      },
      {
        rank: 3,
        title: `Best ${keyword} - Competitor A`,
        snippet: "Commercial competitor page.",
        url: `https://competitor-a.example/${keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      },
      {
        rank: 4,
        title: `${keyword} ideas - Competitor B`,
        snippet: "Recipe and roundup style content.",
        url: `https://competitor-b.example/${keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ideas`,
      },
    ];
  }

  async classifyForumOrSocial(result: { url: string }) {
    return /reddit|instagram|amazon|facebook|tiktok/i.test(result.url);
  }

  async scrapeMarkdown(url: string) {
    return {
      markdown: `# Mock content for ${url}\n\n## What matters\n\nUseful section.\n\n## Comparison\n\nMore useful content.\n\n### Detail\n\nExtra detail.`,
      title: `Mock page for ${url}`,
      metaDescription: "Mock competitor description.",
    };
  }

  async extractHeadings(markdown: string) {
    return markdown
      .split("\n")
      .filter((line) => /^#{2,4}\s/.test(line))
      .map((line) => ({
        level: line.match(/^#+/)?.[0].length ?? 2,
        text: line.replace(/^#{2,4}\s*/, ""),
      }));
  }

  async fetchCompetitorKeywords(url: string) {
    const seed = url.includes("ideas") ? "ideas" : "guide";
    return [
      { keyword: `${seed} meal delivery`, searchVolume: 1400 },
      { keyword: `best ${seed} meals`, searchVolume: 880 },
      { keyword: `${seed} dinner options`, searchVolume: 540 },
    ];
  }

  async fetchSecondaryKeywords(keyword: string) {
    return [
      { keyword: `${keyword} delivery`, searchVolume: 2200 },
      { keyword: `best ${keyword}`, searchVolume: 1800 },
      { keyword: `${keyword} ideas`, searchVolume: 1200 },
      { keyword: `${keyword} guide`, searchVolume: 940 },
      { keyword: `${keyword} near me`, searchVolume: 620 },
    ];
  }

  async fetchInternalLinkCandidates(keyword: string) {
    const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return [
      { title: "What is prepared meal delivery?", url: "/blog/what-is-prepared-meal-delivery" },
      { title: `CookUnity guide to ${keyword}`, url: `/blog/${slug}-guide` },
      { title: "Meal delivery vs meal kits", url: "/blog/meal-delivery-vs-meal-kits" },
    ];
  }

  async determineMealFilters(keyword: string) {
    const lowered = keyword.toLowerCase();
    if (lowered.includes("keto")) return ["keto"];
    if (lowered.includes("vegan")) return ["vegan"];
    if (lowered.includes("vegetarian")) return ["vegetarian"];
    if (lowered.includes("low sodium")) return ["low sodium"];
    return [];
  }

  async fetchMeals(filters: string[]) {
    const base = [
      { id: "meal_1", name: "Mushroom risotto", chef: "Chef Silvia", dietaryTags: ["vegetarian"] },
      { id: "meal_2", name: "Chicken shawarma bowl", chef: "Chef Chris", dietaryTags: ["high protein"] },
      { id: "meal_3", name: "Cauliflower tikka masala", chef: "Chef Akhtar", dietaryTags: ["vegetarian", "gluten free"] },
    ];
    return filters.length
      ? base.filter((meal) => filters.every((filter) => meal.dietaryTags.includes(filter)))
      : base;
  }

  async searchImageCandidates(term: string) {
    const slug = term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return [
      { id: `${slug}_1`, url: `https://images.unsplash.com/photo-1-${slug}`, width: 1600, height: 900 },
      { id: `${slug}_2`, url: `https://images.unsplash.com/photo-2-${slug}`, width: 1600, height: 900 },
      { id: `${slug}_3`, url: `https://images.unsplash.com/photo-3-${slug}`, width: 1600, height: 900 },
    ];
  }
}

export class MockStrapiProvider implements StrapiProvider {
  async createDraft(payload: StrapiArticlePayload): Promise<{ entryId: string; documentId?: string; previewUrl?: string }> {
    return {
      entryId: `mock_${payload.slug}`,
      documentId: `doc_${payload.slug}`,
      previewUrl: `https://cms.mock.local/preview/${payload.slug}`,
    };
  }

  async updateArticle(): Promise<void> {}

  async publishArticle(): Promise<void> {}

  async unpublishArticle(): Promise<void> {}

  async getArticleStatus(): Promise<{ status: string; publishedAt?: string; documentId?: string }> {
    return { status: "published", publishedAt: new Date().toISOString(), documentId: "doc_mock" };
  }

  getContentModelConfig(): StrapiContentModelConfig {
    return getStrapiContentModelConfig();
  }
}
