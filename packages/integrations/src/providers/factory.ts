import { getConfig } from "@cookunity-seo-agent/shared";
import {
  MockAhrefsProvider,
  MockAnalyticsProvider,
  MockGscProvider,
  MockSerpProvider,
  MockStrapiProvider,
  MockTrendsProvider,
} from "../mock/providers";
import {
  LiveAhrefsProvider,
  LiveAnalyticsProvider,
  LiveGscProvider,
  LiveSerpProvider,
  LiveStrapiProvider,
  LiveTrendsProvider,
} from "../live/providers";
import type {
  AhrefsProvider,
  AnalyticsProvider,
  GscProvider,
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
      strapi: new MockStrapiProvider(),
    };
  }

  return {
    ahrefs: new LiveAhrefsProvider(),
    gsc: new LiveGscProvider(),
    trends: new LiveTrendsProvider(),
    serp: new LiveSerpProvider(),
    analytics: new LiveAnalyticsProvider(),
    strapi: new LiveStrapiProvider(),
  };
}
