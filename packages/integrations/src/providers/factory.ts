import { getConfig } from "@cookunity-seo-agent/shared";
import {
  MockAhrefsProvider,
  MockAnalyticsProvider,
  MockGscProvider,
  MockReviewDocumentProvider,
  MockSerpProvider,
  MockStrapiProvider,
  MockTrendsProvider,
  MockWorkflowResearchProvider,
} from "../mock/providers";
import {
  LiveAhrefsProvider,
  LiveAnalyticsProvider,
  LiveGscProvider,
  LiveReviewDocumentProvider,
  LiveSerpProvider,
  LiveStrapiProvider,
  LiveTrendsProvider,
  LiveWorkflowResearchProvider,
} from "../live/providers";
import type {
  AhrefsProvider,
  AnalyticsProvider,
  GscProvider,
  ReviewDocumentProvider,
  SerpProvider,
  StrapiProvider,
  TrendsProvider,
  WorkflowResearchProvider,
} from "./types";

export interface ProviderBundle {
  ahrefs: AhrefsProvider;
  gsc: GscProvider;
  trends: TrendsProvider;
  serp: SerpProvider;
  analytics: AnalyticsProvider;
  reviewDocuments: ReviewDocumentProvider;
  workflowResearch: WorkflowResearchProvider;
  strapi: StrapiProvider;
}

export function createProviders(): ProviderBundle {
  const config = getConfig();
  if (config.APP_MODE === "mock" || config.ENABLE_MOCK_DATA) {
    return {
      ahrefs: new MockAhrefsProvider(),
      gsc: new MockGscProvider(),
      trends: new MockTrendsProvider(),
      serp: new MockSerpProvider(),
      analytics: new MockAnalyticsProvider(),
      reviewDocuments: new MockReviewDocumentProvider(),
      workflowResearch: new MockWorkflowResearchProvider(),
      strapi: new MockStrapiProvider(),
    };
  }

  const hasGoogleServiceAccount =
    Boolean(config.GOOGLE_SERVICE_ACCOUNT_EMAIL) && Boolean(config.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  const canUseLiveGsc = hasGoogleServiceAccount && Boolean(config.GSC_SITE_URL);
  const canUseLiveAnalytics = hasGoogleServiceAccount && Boolean(config.GA4_PROPERTY_ID);
  const canUseLiveReviewDocs = hasGoogleServiceAccount && config.GOOGLE_DOCS_REVIEW_ENABLED;
  const canUseLiveStrapi = Boolean(config.STRAPI_API_TOKEN);
  const canUseLiveAhrefs = Boolean(config.AHREFS_API_KEY);

  return {
    ahrefs: canUseLiveAhrefs ? new LiveAhrefsProvider() : new MockAhrefsProvider(),
    gsc: canUseLiveGsc ? new LiveGscProvider() : new MockGscProvider(),
    // These live providers are still stubbed, so default to mock until implemented.
    trends: new MockTrendsProvider(),
    serp: new MockSerpProvider(),
    analytics: canUseLiveAnalytics ? new LiveAnalyticsProvider() : new MockAnalyticsProvider(),
    reviewDocuments: canUseLiveReviewDocs ? new LiveReviewDocumentProvider() : new MockReviewDocumentProvider(),
    // The brief/draft pipeline still relies on methods that are not fully implemented in the live provider.
    workflowResearch: new MockWorkflowResearchProvider(),
    strapi: canUseLiveStrapi ? new LiveStrapiProvider() : new MockStrapiProvider(),
  };
}
