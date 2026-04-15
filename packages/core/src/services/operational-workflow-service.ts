import { prisma } from "@cookunity-seo-agent/db";
import { getConfig, log, type ContentBrief, type Draft } from "@cookunity-seo-agent/shared";
import { KeywordIntelligenceService } from "./keyword-intelligence-service";
import { TopicPrioritizationService } from "./topic-prioritization-service";
import { OutlineGenerationService } from "./outline-generation-service";
import { DraftingService } from "./drafting-service";
import { ReviewDocumentService } from "./review-document-service";
import { MonitoringService } from "./monitoring-service";
import { OptimizationService } from "./optimization-service";
import { PublishingService } from "./publishing-service";
import type { ExistingContentRecord } from "../guards/cannibalization";

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toJsonInput(value: unknown) {
  return value as never;
}

function readDraft(value: unknown): Draft | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Draft;
}

export class OperationalWorkflowService {
  private readonly keywordIntelligence = new KeywordIntelligenceService();
  private readonly topicPrioritization = new TopicPrioritizationService();
  private readonly outlineGeneration = new OutlineGenerationService();
  private readonly drafting = new DraftingService();
  private readonly reviewDocuments = new ReviewDocumentService();
  private readonly monitoring = new MonitoringService();
  private readonly optimization = new OptimizationService();
  private readonly publishing = new PublishingService();

  async discoverAndPersist(seedTerms: string[]): Promise<{ count: number; topKeyword?: string }> {
    const existingInventory = await this.getExistingInventory();
    const discovered = await this.keywordIntelligence.discover(seedTerms);
    const prioritized = this.topicPrioritization.prioritize(
      discovered.map((record) => ({
        keyword: record.keyword,
        searchVolume: record.searchVolume,
        keywordDifficulty: record.keywordDifficulty,
        trendVelocity: record.trendVelocity,
        businessRelevance: this.estimateBusinessRelevance(record.keyword),
        conversionIntent: this.estimateConversionIntent(record.intent),
        competitorGap: record.intent.includes("comparison") ? 72 : 54,
        freshnessOpportunity: record.trendVelocity > 0 ? 68 : 42,
        clusterValue: record.intent.includes("question") ? 58 : 80,
        authorityFit: record.keyword.includes("meal") ? 92 : 64,
      })),
      existingInventory,
    );

    for (const record of discovered) {
      const normalizedTerm = normalizeKeyword(record.keyword);
      const keyword = await prisma.keyword.upsert({
        where: { normalizedTerm },
        update: {
          term: record.keyword,
          source: record.source,
          searchVolume: record.searchVolume,
          keywordDifficulty: record.keywordDifficulty,
          trendVelocity: record.trendVelocity,
        },
        create: {
          term: record.keyword,
          normalizedTerm,
          source: record.source,
          searchVolume: record.searchVolume,
          keywordDifficulty: record.keywordDifficulty,
          trendVelocity: record.trendVelocity,
        },
      });

      const scored = prioritized.find((item) => normalizeKeyword(item.keyword) === normalizedTerm);
      await prisma.topicCandidate.upsert({
        where: { normalizedKeyword: normalizedTerm },
        update: {
          title: record.keyword,
          keywordId: keyword.id,
          source: record.source,
          workflowState: scored ? "scored" : "discovered",
          recommendation: scored?.recommendation ?? "monitor",
          totalScore: scored?.totalScore ?? 0,
          scoreBreakdownJson: toJsonInput(scored?.breakdown ?? {}),
          rationale: scored?.explanation ?? record.notes ?? "Discovered from scheduled keyword research.",
          cannibalizationRisk: scored?.cannibalizationRisk ?? 0,
          topicType: scored?.topicType ?? "new_article",
        },
        create: {
          title: record.keyword,
          normalizedKeyword: normalizedTerm,
          keywordId: keyword.id,
          source: record.source,
          workflowState: scored ? "scored" : "discovered",
          recommendation: scored?.recommendation ?? "monitor",
          totalScore: scored?.totalScore ?? 0,
          scoreBreakdownJson: toJsonInput(scored?.breakdown ?? {}),
          rationale: scored?.explanation ?? record.notes ?? "Discovered from scheduled keyword research.",
          cannibalizationRisk: scored?.cannibalizationRisk ?? 0,
          topicType: scored?.topicType ?? "new_article",
        },
      });
    }

    return {
      count: prioritized.length,
      ...(prioritized[0]?.keyword ? { topKeyword: prioritized[0].keyword } : {}),
    };
  }

  async draftNextTopic(): Promise<{ topicId: string; draftId: string; reviewDocUrl: string } | null> {
    const topic = await prisma.topicCandidate.findFirst({
      where: {
        workflowState: { in: ["scored", "queued", "revision_requested", "refresh_recommended"] },
        recommendation: { in: ["write_now", "refresh_existing", "support_cluster"] },
      },
      orderBy: [{ totalScore: "desc" }, { updatedAt: "asc" }],
    });

    if (!topic) {
      return null;
    }

    const brief = this.outlineGeneration.generate({
      id: topic.id,
      keyword: topic.title,
      recommendation: topic.recommendation,
    });

    await prisma.topicCandidate.update({
      where: { id: topic.id },
      data: { workflowState: "outline_generated" },
    });

    const briefRecord = await prisma.contentBrief.create({
      data: {
        topicCandidateId: topic.id,
        promptVersionId: "outline_generation:v1",
        primaryKeyword: brief.primaryKeyword,
        secondaryKeywordsJson: toJsonInput(brief.secondaryKeywords),
        briefJson: toJsonInput(brief),
      },
    });

    await prisma.outline.create({
      data: {
        topicCandidateId: topic.id,
        promptVersionId: "outline_generation:v1",
        outlineJson: toJsonInput({
          titleOptions: brief.titleOptions,
          recommendedInternalLinks: brief.recommendedInternalLinks,
          faqCandidates: brief.faqCandidates,
        }),
      },
    });

    const draft = await this.drafting.generate(brief);
    const reviewDoc = await this.reviewDocuments.createReviewDocument({
      brief,
      draft,
      reviewerEmail: getConfig().ADMIN_EMAIL,
    });
    const enrichedDraft = {
      ...draft,
      reviewDocUrl: reviewDoc.url,
      reviewDocProvider: reviewDoc.provider,
      reviewDocId: reviewDoc.id,
    };

    const draftRecord = await prisma.draft.create({
      data: {
        topicCandidateId: topic.id,
        briefId: briefRecord.id,
        promptVersionId: draft.promptVersionId,
        draftJson: toJsonInput(enrichedDraft),
        html: draft.html,
        markdown: JSON.stringify(draft.sections),
      },
    });

    await prisma.topicCandidate.update({
      where: { id: topic.id },
      data: { workflowState: "in_review" },
    });

    return { topicId: topic.id, draftId: draftRecord.id, reviewDocUrl: reviewDoc.url };
  }

  async monitorAndPersist(urls?: string[]): Promise<{ snapshotCount: number; optimizationCount: number }> {
    const publications = await prisma.publication.findMany({
      where: { status: "published", ...(urls?.length ? { canonicalUrl: { in: urls } } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    const monitoringUrls = publications
      .map((publication) => publication.canonicalUrl || (publication.slug ? `${getConfig().GSC_SITE_URL}/blog/${publication.slug}` : null))
      .filter((value): value is string => Boolean(value));

    if (monitoringUrls.length === 0) {
      return { snapshotCount: 0, optimizationCount: 0 };
    }

    const snapshots = await this.monitoring.snapshot(monitoringUrls);
    let optimizationCount = 0;

    for (const publication of publications) {
      const url = publication.canonicalUrl || (publication.slug ? `${getConfig().GSC_SITE_URL}/blog/${publication.slug}` : null);
      if (!url) continue;
      const relevant = snapshots.filter((snapshot) => snapshot.url === url);
      if (!relevant.length) continue;

      for (const snapshot of relevant) {
        await prisma.metricSnapshot.create({
          data: {
            publicationId: publication.id,
            impressions: snapshot.impressions,
            clicks: snapshot.clicks,
            ctr: snapshot.ctr,
            averagePosition: snapshot.averagePosition,
            conversions: snapshot.conversions,
            metricsJson: toJsonInput(snapshot),
          },
        });
      }

      const tasks = this.optimization.detect(
        publication.id,
        relevant.map((snapshot) => ({
          impressions: snapshot.impressions,
          ctr: snapshot.ctr,
          averagePosition: snapshot.averagePosition,
          conversions: snapshot.conversions,
        })),
      );

      for (const task of tasks) {
        optimizationCount += 1;
        await prisma.optimizationRecommendation.create({
          data: {
            publicationId: publication.id,
            topicCandidateId: publication.topicCandidateId,
            type: task.type,
            priority: task.priority,
            reason: task.reason,
            recommendationJson: toJsonInput(task),
          },
        });
        await prisma.topicCandidate.update({
          where: { id: publication.topicCandidateId },
          data: { workflowState: "refresh_recommended" },
        });
      }
    }

    return { snapshotCount: snapshots.length, optimizationCount };
  }

  async publishApproved(): Promise<Array<{ topicId: string; entryId: string }>> {
    const approvedTopics = await prisma.topicCandidate.findMany({
      where: { workflowState: "approved" },
      include: {
        drafts: { orderBy: { createdAt: "desc" }, take: 1 },
        publications: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
      take: 20,
    });

    const published: Array<{ topicId: string; entryId: string }> = [];

    for (const topic of approvedTopics) {
      const draftRecord = topic.drafts[0];
      if (!draftRecord) continue;
      const draft = readDraft(draftRecord.draftJson);
      if (!draft) continue;

      const existingPublication = topic.publications[0];
      const result = await this.publishing.publishArticle({
        draft,
        approved: true,
        tags: ["meal delivery", "prepared meals"],
        categories: ["CookUnity Blog"],
        ...(existingPublication?.strapiEntryId ? { existingEntryId: existingPublication.strapiEntryId } : {}),
        ...(existingPublication?.strapiDocumentId ? { existingDocumentId: existingPublication.strapiDocumentId } : {}),
        ...(draft.metaDescriptionOptions[0] ? { excerpt: draft.metaDescriptionOptions[0] } : {}),
      });

      if (existingPublication) {
        await prisma.publication.update({
          where: { id: existingPublication.id },
          data: {
            strapiEntryId: result.entryId,
            strapiDocumentId: result.documentId ?? null,
            slug: draft.slugRecommendation,
            status: "published",
            metadataJson: toJsonInput(result.fieldMapping),
            publishedAt: new Date(),
          },
        });
      } else {
        await prisma.publication.create({
          data: {
            topicCandidateId: topic.id,
            draftId: draftRecord.id,
            strapiEntryId: result.entryId,
            strapiDocumentId: result.documentId ?? null,
            slug: draft.slugRecommendation,
            canonicalUrl: `${getConfig().GSC_SITE_URL}/blog/${draft.slugRecommendation}`,
            status: "published",
            metadataJson: toJsonInput(result.fieldMapping),
            publishedAt: new Date(),
          },
        });
      }

      await prisma.topicCandidate.update({
        where: { id: topic.id },
        data: { workflowState: "published" },
      });

      published.push({ topicId: topic.id, entryId: result.entryId });
    }

    return published;
  }

  private async getExistingInventory(): Promise<ExistingContentRecord[]> {
    const publications = await prisma.publication.findMany({
      where: { status: "published" },
      include: { topicCandidate: true },
      take: 100,
      orderBy: { updatedAt: "desc" },
    });

    return publications.map((publication) => ({
      id: publication.id,
      title: publication.topicCandidate.title,
      primaryKeyword: publication.topicCandidate.title,
      secondaryKeywords: [],
    }));
  }

  private estimateBusinessRelevance(keyword: string): number {
    const normalized = keyword.toLowerCase();
    if (normalized.includes("meal delivery") || normalized.includes("prepared meal")) return 95;
    if (normalized.includes("healthy")) return 82;
    return 60;
  }

  private estimateConversionIntent(intent: string): number {
    const normalized = intent.toLowerCase();
    if (normalized.includes("commercial") || normalized.includes("comparison")) return 88;
    if (normalized.includes("question")) return 58;
    return 70;
  }
}

export function logOperationalResult(service: string, event: string, payload: Record<string, unknown>): void {
  log("info", event, { service, ...payload });
}
