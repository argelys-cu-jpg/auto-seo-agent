export interface KeywordDiscoveryRecord {
  keyword: string;
  source: "ahrefs" | "gsc" | "trends" | "serp";
  searchVolume: number;
  keywordDifficulty: number;
  trendVelocity: number;
  intent: string;
  notes?: string;
}

export interface PerformanceRecord {
  url: string;
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  conversions?: number;
}

export interface ReviewDocumentPayload {
  title: string;
  summary: string;
  markdown: string;
  html: string;
  reviewerEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface ReviewDocumentRecord {
  id: string;
  title: string;
  url: string;
  provider: "google_docs" | "mock";
}

export interface StrapiArticlePayload {
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  categories: string[];
  canonicalUrl?: string;
  schemaJson?: Record<string, unknown>;
  featuredImage?: string;
  status: "draft" | "publish";
}

export interface StrapiContentModelConfig {
  collection: string;
  documentIdField: string;
  entryIdField: string;
  fields: {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    seoTitle: string;
    metaDescription: string;
    schema: string;
    tags: string;
    category: string;
    featuredImage: string;
    publishStatus: string;
  };
}

export interface AhrefsProvider {
  discoverKeywords(seedTerms: string[]): Promise<KeywordDiscoveryRecord[]>;
}

export interface GscProvider {
  discoverContentDecay(): Promise<KeywordDiscoveryRecord[]>;
  fetchPerformance(urls?: string[]): Promise<PerformanceRecord[]>;
}

export interface TrendsProvider {
  discoverRisingTopics(seedTerms: string[]): Promise<KeywordDiscoveryRecord[]>;
}

export interface SerpProvider {
  discoverQuestions(seedTerms: string[]): Promise<KeywordDiscoveryRecord[]>;
}

export interface AnalyticsProvider {
  fetchConversions(urls: string[]): Promise<Array<{ url: string; conversions: number }>>;
}

export interface ReviewDocumentProvider {
  createDocument(payload: ReviewDocumentPayload): Promise<ReviewDocumentRecord>;
  updateDocument(documentId: string, payload: ReviewDocumentPayload): Promise<ReviewDocumentRecord>;
}

export interface StrapiProvider {
  createDraft(payload: StrapiArticlePayload): Promise<{ entryId: string; documentId?: string; previewUrl?: string }>;
  updateArticle(entryId: string, payload: StrapiArticlePayload, documentId?: string): Promise<void>;
  publishArticle(entryId: string, documentId?: string): Promise<void>;
  unpublishArticle(entryId: string, documentId?: string): Promise<void>;
  getArticleStatus(entryId: string, documentId?: string): Promise<{ status: string; publishedAt?: string; documentId?: string }>;
  getContentModelConfig(): StrapiContentModelConfig;
}
