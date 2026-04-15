import { getConfig } from "@cookunity-seo-agent/shared";
import {
  MockAhrefsProvider,
  MockAnalyticsProvider,
  MockGscProvider,
  MockReviewDocumentProvider,
  MockSerpProvider,
  MockStrapiProvider,
  MockTrendsProvider,
} from "../mock/providers";
import {
  LiveAhrefsProvider,
  LiveAnalyticsProvider,
  LiveGscProvider,
  LiveReviewDocumentProvider,
  LiveSerpProvider,
  LiveStrapiProvider,
  LiveTrendsProvider,
} from "../live/providers";
import type {
  AhrefsProvider,
  AnalyticsProvider,
  GscProvider,
  ReviewDocumentProvider,
  SerpProvider,
  StrapiProvider,
  TrendsProvider,
} from "./types";

export interface ProviderBundle {
  ahrefs: AhrefsProvider;
  gsc: GscProvider;
  trends: TrendsProvider;
  serp: SerpProvider;
  analytics: AnalyticsProvider;
  reviewDocuments: ReviewDocumentProvider;
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
      strapi: new MockStrapiProvider(),
    };
  }

  return {
    ahrefs: new LiveAhrefsProvider(),
    gsc: new LiveGscProvider(),
    trends: new LiveTrendsProvider(),
    serp: new LiveSerpProvider(),
    analytics: new LiveAnalyticsProvider(),
    reviewDocuments: new LiveReviewDocumentProvider(),
    strapi: new LiveStrapiProvider(),
  };
}
