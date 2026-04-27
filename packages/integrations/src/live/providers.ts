import { getConfig, searchCookunityMeals } from "@cookunity-seo-agent/shared";
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
import { getGoogleServiceAccessToken } from "../providers/google-service-account";
import { identifyMainInternalLink } from "../providers/internal-link-catalog";
import { getStrapiContentModelConfig, mapToStrapiData } from "../providers/strapi-mapper";

async function safeJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Provider request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchSemrushCsvRows(
  type: string,
  params: Record<string, string>,
): Promise<string[][]> {
  const config = getConfig();
  if (!config.SEMRUSH_API_KEY) {
    throw new Error("SEMRUSH_API_KEY is required for live Semrush requests.");
  }

  const url = new URL(config.SEMRUSH_BASE_URL);
  url.searchParams.set("type", type);
  url.searchParams.set("key", config.SEMRUSH_API_KEY);
  url.searchParams.set("database", "us");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Semrush request failed: ${response.status}`);
  }

  const text = await response.text();
  const lines = text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).map((line) => line.split(";"));
}

export class LiveAhrefsProvider implements AhrefsProvider {
  async discoverKeywords(seedTerms: string[]): Promise<KeywordDiscoveryRecord[]> {
    const config = getConfig();
    if (!config.AHREFS_API_KEY) {
      throw new Error("AHREFS_API_KEY is required for live mode.");
    }

    const normalizedSeeds = [...new Set(seedTerms.map((term) => term.trim()).filter(Boolean))];
    if (normalizedSeeds.length === 0) {
      return [];
    }

    const overviewPromise = this.fetchKeywordReport("overview", {
      keywords: normalizedSeeds.join(","),
      limit: String(Math.min(normalizedSeeds.length, 50)),
    });

    const matchingTermsPromise = this.fetchKeywordReport("matching-terms", {
      keywords: normalizedSeeds.join(","),
      limit: "40",
      match_mode: "terms",
      terms: "all",
      order_by: "volume:desc",
    });

    const questionTermsPromise = this.fetchKeywordReport("matching-terms", {
      keywords: normalizedSeeds.join(","),
      limit: "20",
      match_mode: "terms",
      terms: "questions",
      order_by: "volume:desc",
    });

    const suggestionsPromise = this.fetchKeywordReport("search-suggestions", {
      keywords: normalizedSeeds.join(","),
      limit: "20",
      order_by: "volume:desc",
    });

    const [overview, matchingTerms, questionTerms, suggestions] = await Promise.all([
      overviewPromise,
      matchingTermsPromise,
      questionTermsPromise,
      suggestionsPromise,
    ]);

    const byKeyword = new Map<string, KeywordDiscoveryRecord>();
    for (const row of [...overview, ...matchingTerms, ...questionTerms, ...suggestions]) {
      const record = this.mapKeywordRow(row);
      const key = record.keyword.toLowerCase();
      const existing = byKeyword.get(key);
      if (!existing || record.searchVolume > existing.searchVolume) {
        byKeyword.set(key, record);
      }
    }

    return [...byKeyword.values()].sort((left, right) => right.searchVolume - left.searchVolume);
  }

  private async fetchKeywordReport(
    report: "overview" | "matching-terms" | "search-suggestions",
    params: Record<string, string>,
  ): Promise<Array<Record<string, unknown>>> {
    const config = getConfig();
    const url = new URL(`${config.AHREFS_BASE_URL}/v3/keywords-explorer/${report}`);
    url.searchParams.set("country", config.AHREFS_COUNTRY);
    url.searchParams.set(
      "select",
      [
        "keyword",
        "volume",
        "volume_monthly",
        "difficulty",
        "intents",
        "parent_topic",
        "traffic_potential",
        "cpc",
      ].join(","),
    );

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${config.AHREFS_API_KEY}`,
        Accept: "application/json",
      },
    });

    const payload = await safeJson<{ keywords?: Array<Record<string, unknown>> }>(response);
    return payload.keywords ?? [];
  }

  private mapKeywordRow(row: Record<string, unknown>): KeywordDiscoveryRecord {
    const keyword = String(row.keyword ?? "").trim();
    const volume = Number(row.volume ?? 0);
    const volumeMonthly = Number(row.volume_monthly ?? volume);
    const difficulty = Number(row.difficulty ?? 0);
    const trafficPotential = Number(row.traffic_potential ?? 0);
    const parentTopic = String(row.parent_topic ?? "").trim();
    const cpc = Number(row.cpc ?? 0);

    return {
      keyword,
      source: "ahrefs",
      searchVolume: Number.isFinite(volume) ? volume : 0,
      keywordDifficulty: Number.isFinite(difficulty) ? difficulty : 0,
      // Inference: use latest month vs. 12-month average as a lightweight momentum signal.
      trendVelocity: this.estimateTrendVelocity(volume, volumeMonthly),
      intent: this.mapIntent(row.intents),
      notes: this.buildNotes({
        parentTopic,
        trafficPotential,
        cpc,
      }),
    };
  }

  private estimateTrendVelocity(volume: number, volumeMonthly: number) {
    if (!Number.isFinite(volume) || volume <= 0 || !Number.isFinite(volumeMonthly)) {
      return 0;
    }
    const delta = ((volumeMonthly - volume) / volume) * 100;
    return Math.max(-100, Math.min(100, Math.round(delta)));
  }

  private mapIntent(raw: unknown) {
    if (!raw || typeof raw !== "object") {
      return "unknown";
    }

    const intentPairs: Array<[string, string]> = [
      ["informational", "informational"],
      ["commercial", "commercial investigation"],
      ["transactional", "transactional"],
      ["navigational", "navigational"],
      ["local", "local"],
      ["branded", "branded"],
    ];

    const intentMap = raw as Record<string, unknown>;
    const labels: string[] = [];
    for (const pair of intentPairs) {
      const key = pair[0];
      const label = pair[1];
      if (intentMap[key] === true) {
        labels.push(label);
      }
    }

    return labels.length ? labels.join(" + ") : "unknown";
  }

  private buildNotes(args: {
    parentTopic?: string;
    trafficPotential?: number;
    cpc?: number;
  }) {
    const parts: string[] = [];
    if (args.parentTopic) {
      parts.push(`Parent topic: ${args.parentTopic}`);
    }
    if (args.trafficPotential && args.trafficPotential > 0) {
      parts.push(`Traffic potential: ${args.trafficPotential.toLocaleString()}`);
    }
    if (args.cpc && args.cpc > 0) {
      parts.push(`CPC: $${(args.cpc / 100).toFixed(2)}`);
    }
    return parts.join(" • ") || "Mapped from Ahrefs Keywords Explorer.";
  }
}

export class LiveGscProvider implements GscProvider {
  async discoverContentDecay(): Promise<KeywordDiscoveryRecord[]> {
    const config = getConfig();
    if (!config.GSC_SITE_URL) {
      throw new Error("GSC_SITE_URL is required for live GSC mode.");
    }

    const token = await getGoogleServiceAccessToken([
      "https://www.googleapis.com/auth/webmasters.readonly",
    ]);

    const [recent, previous] = await Promise.all([
      this.querySearchConsole(token, {
        siteUrl: config.GSC_SITE_URL,
        startDate: this.daysAgo(28),
        endDate: this.daysAgo(1),
      }),
      this.querySearchConsole(token, {
        siteUrl: config.GSC_SITE_URL,
        startDate: this.daysAgo(56),
        endDate: this.daysAgo(29),
      }),
    ]);

    const previousByQuery = new Map(previous.map((row) => [row.keys?.[0] ?? "", row]));
    return recent.slice(0, 25).map((row) => {
      const keyword = row.keys?.[0] ?? "";
      const baseline = previousByQuery.get(keyword);
      const recentClicks = Number(row.clicks ?? 0);
      const previousClicks = Number(baseline?.clicks ?? 0);
      const trendVelocity =
        previousClicks > 0 ? ((recentClicks - previousClicks) / previousClicks) * 100 : 0;

      return {
        keyword,
        source: "gsc",
        searchVolume: Number(row.impressions ?? 0),
        keywordDifficulty: Math.min(60, Math.max(10, Math.round(Number(row.position ?? 20) * 3))),
        trendVelocity,
        intent: "existing content decay",
        notes: `Avg position ${Number(row.position ?? 0).toFixed(1)}, CTR ${(Number(row.ctr ?? 0) * 100).toFixed(1)}%.`,
      };
    });
  }

  async fetchPerformance(urls?: string[]): Promise<PerformanceRecord[]> {
    const config = getConfig();
    const token = await getGoogleServiceAccessToken([
      "https://www.googleapis.com/auth/webmasters.readonly",
    ]);

    const rows = await this.querySearchConsole(token, {
      siteUrl: config.GSC_SITE_URL,
      startDate: this.daysAgo(28),
      endDate: this.daysAgo(1),
      dimensions: ["page", "query"],
      rowLimit: 250,
      ...(urls?.length ? { urls } : {}),
    });

    return rows
      .filter((row) => row.keys?.[0] && row.keys?.[1])
      .map((row) => ({
        url: String(row.keys?.[0]),
        query: String(row.keys?.[1]),
        impressions: Number(row.impressions ?? 0),
        clicks: Number(row.clicks ?? 0),
        ctr: Number(row.ctr ?? 0),
        averagePosition: Number(row.position ?? 0),
        conversions: 0,
      }));
  }

  private async querySearchConsole(
    token: string,
    args: {
      siteUrl: string;
      startDate: string;
      endDate: string;
      dimensions?: string[];
      rowLimit?: number;
      urls?: string[];
    },
  ): Promise<Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }>> {
    const siteUrl = encodeURIComponent(args.siteUrl);
    const response = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: args.startDate,
          endDate: args.endDate,
          dimensions: args.dimensions ?? ["query"],
          rowLimit: args.rowLimit ?? 100,
          ...(args.urls?.length
            ? {
                dimensionFilterGroups: [
                  {
                    filters: [
                      {
                        dimension: "page",
                        operator: "includingRegex",
                        expression: args.urls.map((url) => url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
                      },
                    ],
                  },
                ],
              }
            : {}),
        }),
      },
    );

    const payload = await safeJson<{ rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }> }>(response);
    return payload.rows ?? [];
  }

  private daysAgo(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
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
  async fetchConversions(urls: string[]): Promise<Array<{ url: string; conversions: number }>> {
    const config = getConfig();
    if (!config.GA4_PROPERTY_ID) {
      throw new Error("GA4_PROPERTY_ID is required for live analytics mode.");
    }
    if (!config.GOOGLE_SERVICE_ACCOUNT_EMAIL || !config.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      throw new Error("Google service account credentials are required for GA4 access.");
    }

    const token = await getGoogleServiceAccessToken([
      "https://www.googleapis.com/auth/analytics.readonly",
    ]);
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${config.GA4_PROPERTY_ID}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dimensions: [{ name: "pageLocation" }],
          metrics: [{ name: "conversions" }],
          dimensionFilter: {
            filter: {
              fieldName: "pageLocation",
              inListFilter: { values: urls },
            },
          },
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        }),
      },
    );

    const payload = await safeJson<{ rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }> }>(response);
    const rows = payload.rows ?? [];
    return urls.map((url) => {
      const row = rows.find((item) => item.dimensionValues?.[0]?.value === url);
      return {
        url,
        conversions: Number(row?.metricValues?.[0]?.value ?? 0),
      };
    });
  }
}

export class LiveReviewDocumentProvider implements ReviewDocumentProvider {
  private async getHeaders(): Promise<HeadersInit> {
    const token = await getGoogleServiceAccessToken([
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
    ]);

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async createDocument(payload: ReviewDocumentPayload): Promise<ReviewDocumentRecord> {
    const config = getConfig();
    if (!config.GOOGLE_DOCS_REVIEW_ENABLED) {
      throw new Error("GOOGLE_DOCS_REVIEW_ENABLED must be true to create live review docs.");
    }

    const createResponse = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: await this.getHeaders(),
      body: JSON.stringify({ title: payload.title }),
    });
    const created = await safeJson<{ documentId: string; title?: string }>(createResponse);

    await this.replaceDocumentContent(created.documentId, payload);

    if (config.GOOGLE_DRIVE_REVIEW_FOLDER_ID) {
      await this.moveDocumentToFolder(created.documentId, config.GOOGLE_DRIVE_REVIEW_FOLDER_ID);
    }

    return {
      id: created.documentId,
      title: created.title ?? payload.title,
      url: `https://docs.google.com/document/d/${created.documentId}/edit`,
      provider: "google_docs",
    };
  }

  async updateDocument(documentId: string, payload: ReviewDocumentPayload): Promise<ReviewDocumentRecord> {
    await this.replaceDocumentContent(documentId, payload);
    return {
      id: documentId,
      title: payload.title,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
      provider: "google_docs",
    };
  }

  private async replaceDocumentContent(documentId: string, payload: ReviewDocumentPayload): Promise<void> {
    const docResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      method: "GET",
      headers: await this.getHeaders(),
    });
    const existing = await safeJson<{ body?: { content?: Array<{ endIndex?: number }> } }>(docResponse);
    const endIndex = existing.body?.content?.at(-1)?.endIndex ?? 1;

    const content = [
      `Title: ${payload.title}`,
      "",
      `Summary: ${payload.summary}`,
      "",
      payload.markdown,
      "",
      `Source HTML length: ${payload.html.length}`,
      payload.reviewerEmail ? `Reviewer: ${payload.reviewerEmail}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: await this.getHeaders(),
      body: JSON.stringify({
        requests: [
          ...(endIndex > 1 ? [{ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } }] : []),
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      }),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Google Docs update failed: ${response.status} ${await response.text()}`);
      }
    });
  }

  private async moveDocumentToFolder(documentId: string, folderId: string): Promise<void> {
    const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${documentId}?fields=parents`, {
      method: "GET",
      headers: await this.getHeaders(),
    });
    const metadata = await safeJson<{ parents?: string[] }>(metadataResponse);
    const removeParents = (metadata.parents ?? []).join(",");
    const url = new URL(`https://www.googleapis.com/drive/v3/files/${documentId}`);
    url.searchParams.set("addParents", folderId);
    if (removeParents) {
      url.searchParams.set("removeParents", removeParents);
    }

    await fetch(url, {
      method: "PATCH",
      headers: await this.getHeaders(),
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Google Drive move failed: ${response.status} ${await response.text()}`);
      }
    });
  }
}

export class LiveWorkflowResearchProvider implements WorkflowResearchProvider {
  async identifyMainInternalLink(keyword: string): Promise<{ keyword: string; link: string }> {
    return identifyMainInternalLink(keyword);
  }

  async fetchKeywordOverview(keyword: string): Promise<{
    keyword: string;
    searchVolume: number;
    cpc?: number;
    competition?: number;
    keywordDifficulty?: number;
    resultsCount?: number;
  }> {
    const [firstRow = []] = await fetchSemrushCsvRows("phrase_this", {
      phrase: keyword,
      export_columns: "Nq,Co,Nr,Kd,Cp",
    });
    const [searchVolume, competition, resultsCount, keywordDifficulty, cpc] = firstRow;

    return {
      keyword,
      searchVolume: Number(searchVolume ?? 0),
      competition: Number(competition ?? 0),
      resultsCount: Number(resultsCount ?? 0),
      keywordDifficulty: Number(keywordDifficulty ?? 0),
      cpc: Number(cpc ?? 0),
    };
  }

  async searchOrganicResults(): Promise<Array<{ rank: number; title: string; snippet: string; url: string }>> {
    throw new Error("Live organic SERP search is not implemented yet.");
  }

  async classifyForumOrSocial(result: { url: string }): Promise<boolean> {
    return /reddit|instagram|amazon|facebook|tiktok/i.test(result.url);
  }

  async scrapeMarkdown(): Promise<{ markdown: string; title?: string; metaDescription?: string }> {
    throw new Error("Live competitor scraping is not implemented yet.");
  }

  async extractHeadings(markdown: string): Promise<Array<{ level: number; text: string }>> {
    return markdown
      .split("\n")
      .filter((line) => /^#{2,4}\s/.test(line))
      .map((line) => ({
        level: line.match(/^#+/)?.[0].length ?? 2,
        text: line.replace(/^#{2,4}\s*/, ""),
      }));
  }

  async fetchCompetitorKeywords(): Promise<Array<{ keyword: string; searchVolume: number }>> {
    throw new Error("Live competitor keyword retrieval is not implemented yet.");
  }

  async fetchSecondaryKeywords(keyword: string): Promise<Array<{ keyword: string; searchVolume: number }>> {
    const rows = await fetchSemrushCsvRows("phrase_related", {
      phrase: keyword,
      export_columns: "Ph,Nq",
      display_limit: "75",
      display_sort: "nq_desc",
    });

    const deduped = new Map<string, number>();
    for (const [relatedKeyword = "", searchVolume = "0"] of rows) {
      const normalized = relatedKeyword.trim().toLowerCase();
      if (!normalized) continue;
      const numericVolume = Number(searchVolume ?? 0);
      const current = deduped.get(normalized) ?? 0;
      deduped.set(normalized, Math.max(current, numericVolume));
    }

    return [...deduped.entries()]
      .map(([normalizedKeyword, searchVolume]) => ({
        keyword: normalizedKeyword,
        searchVolume,
      }))
      .sort((left, right) => right.searchVolume - left.searchVolume);
  }

  async fetchInternalLinkCandidates(): Promise<Array<{ title: string; url: string }>> {
    throw new Error("Live internal link candidate retrieval is not implemented yet.");
  }

  async determineMealFilters(keyword: string): Promise<string[]> {
    const lowered = keyword.toLowerCase();
    if (lowered.includes("keto")) return ["keto"];
    if (lowered.includes("vegan")) return ["vegan"];
    if (lowered.includes("vegetarian")) return ["vegetarian"];
    if (lowered.includes("low sodium")) return ["low sodium"];
    return [];
  }

  async fetchMeals(filters: string[]): Promise<Array<{ id: string; name: string; chef?: string; dietaryTags: string[]; url?: string; imageUrl?: string; description?: string; rating?: number }>> {
    return searchCookunityMeals({
      keyword: filters.join(" ") || "prepared meals",
      filters,
      count: 24,
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
  }

  async searchImageCandidates(): Promise<Array<{ id: string; url: string; width: number; height: number }>> {
    throw new Error("Live image search is not implemented yet.");
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
