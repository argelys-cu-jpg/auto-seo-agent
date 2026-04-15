import type {
  AhrefsProvider,
  AnalyticsProvider,
  GscProvider,
  KeywordDiscoveryRecord,
  PerformanceRecord,
  ReviewDocumentPayload,
  ReviewDocumentProvider,
  ReviewDocumentRecord,
  SerpProvider,
  StrapiArticlePayload,
  StrapiContentModelConfig,
  StrapiProvider,
  TrendsProvider,
} from "../providers/types";
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
