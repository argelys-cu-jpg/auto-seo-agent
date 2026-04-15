import { getConfig } from "@cookunity-seo-agent/shared";
import type {
  AhrefsProvider,
  AnalyticsProvider,
  GscProvider,
  KeywordDiscoveryRecord,
  PerformanceRecord,
  SerpProvider,
  StrapiArticlePayload,
  StrapiContentModelConfig,
  StrapiProvider,
  TrendsProvider,
} from "../providers/types";
import { getStrapiContentModelConfig, mapToStrapiData } from "../providers/strapi-mapper";

async function safeJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Provider request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export class LiveAhrefsProvider implements AhrefsProvider {
  async discoverKeywords(seedTerms: string[]): Promise<KeywordDiscoveryRecord[]> {
    const config = getConfig();
    if (!config.AHREFS_API_KEY) {
      throw new Error("AHREFS_API_KEY is required for live mode.");
    }

    const response = await fetch(`${config.AHREFS_BASE_URL}/v1/keywords`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.AHREFS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ seeds: seedTerms }),
    });

    const payload = await safeJson<{ rows: Array<Record<string, unknown>> }>(response);
    return payload.rows.map((row) => ({
      keyword: String(row.keyword),
      source: "ahrefs",
      searchVolume: Number(row.volume ?? 0),
      keywordDifficulty: Number(row.kd ?? 0),
      trendVelocity: 0,
      intent: String(row.intent ?? "unknown"),
      notes: "Mapped from Ahrefs API response.",
    }));
  }
}

export class LiveGscProvider implements GscProvider {
  async discoverContentDecay(): Promise<KeywordDiscoveryRecord[]> {
    throw new Error("Live GSC discovery is stubbed. Add Search Console API client wiring.");
  }

  async fetchPerformance(): Promise<PerformanceRecord[]> {
    throw new Error("Live GSC performance sync is stubbed. Add Search Console API client wiring.");
  }
}

export class LiveTrendsProvider implements TrendsProvider {
  async discoverRisingTopics(): Promise<KeywordDiscoveryRecord[]> {
    throw new Error("Live Google Trends integration is stubbed. Add provider implementation.");
  }
}

export class LiveSerpProvider implements SerpProvider {
  async discoverQuestions(): Promise<KeywordDiscoveryRecord[]> {
    throw new Error("Live SERP question discovery is stubbed. Add provider implementation.");
  }
}

export class LiveAnalyticsProvider implements AnalyticsProvider {
  async fetchConversions(): Promise<Array<{ url: string; conversions: number }>> {
    throw new Error("Live analytics provider is stubbed. Add provider implementation.");
  }
}

export class LiveStrapiProvider implements StrapiProvider {
  private contentModel = getStrapiContentModelConfig();

  private getHeaders(): HeadersInit {
    const config = getConfig();
    if (!config.STRAPI_API_TOKEN) {
      throw new Error("STRAPI_API_TOKEN is required for live mode.");
    }

    return {
      Authorization: `Bearer ${config.STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  async createDraft(payload: StrapiArticlePayload): Promise<{ entryId: string; documentId?: string; previewUrl?: string }> {
    const config = getConfig();
    const response = await fetch(`${config.STRAPI_BASE_URL}/api/${this.contentModel.collection}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ data: mapToStrapiData({ ...payload, status: "draft" }) }),
    });
    const json = await safeJson<{ data: Record<string, unknown> }>(response);
    const documentId = json.data[this.contentModel.documentIdField]
      ? String(json.data[this.contentModel.documentIdField])
      : undefined;
    return {
      entryId: String(json.data[this.contentModel.entryIdField]),
      ...(documentId ? { documentId } : {}),
    };
  }

  async updateArticle(entryId: string, payload: StrapiArticlePayload): Promise<void> {
    const config = getConfig();
    const response = await fetch(`${config.STRAPI_BASE_URL}/api/${this.contentModel.collection}/${entryId}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({ data: mapToStrapiData(payload) }),
    });
    await safeJson(response);
  }

  async publishArticle(entryId: string, documentId?: string): Promise<void> {
    const config = getConfig();
    const identifier = documentId ?? entryId;
    const response = await fetch(
      `${config.STRAPI_BASE_URL}/api/${this.contentModel.collection}/${identifier}/actions/publish`,
      {
        method: "POST",
        headers: this.getHeaders(),
      },
    );
    await safeJson(response);
  }

  async unpublishArticle(entryId: string, documentId?: string): Promise<void> {
    const config = getConfig();
    const identifier = documentId ?? entryId;
    const response = await fetch(
      `${config.STRAPI_BASE_URL}/api/${this.contentModel.collection}/${identifier}/actions/unpublish`,
      {
        method: "POST",
        headers: this.getHeaders(),
      },
    );
    await safeJson(response);
  }

  async getArticleStatus(entryId: string): Promise<{ status: string; publishedAt?: string; documentId?: string }> {
    const config = getConfig();
    const response = await fetch(
      `${config.STRAPI_BASE_URL}/api/${this.contentModel.collection}/${entryId}`,
      {
        method: "GET",
        headers: this.getHeaders(),
      },
    );
    const json = await safeJson<{ data: Record<string, unknown> }>(response);
    const publishedAt = json.data[this.contentModel.fields.publishStatus];
    const documentId = json.data[this.contentModel.documentIdField]
      ? String(json.data[this.contentModel.documentIdField])
      : undefined;
    return {
      status: publishedAt ? "published" : "draft",
      ...(publishedAt ? { publishedAt: String(publishedAt) } : {}),
      ...(documentId ? { documentId } : {}),
    };
  }

  getContentModelConfig(): StrapiContentModelConfig {
    return this.contentModel;
  }
}
