import { scoreTopic } from "../scoring/model";
import { assessCannibalization, type ExistingContentRecord } from "../guards/cannibalization";

export interface PrioritizedTopic {
  keyword: string;
  totalScore: number;
  breakdown: ReturnType<typeof scoreTopic>["breakdown"];
  explanation: string;
  recommendation: ReturnType<typeof scoreTopic>["recommendation"];
  cannibalizationRisk: number;
  topicType: "new_article" | "refresh_existing" | "support_cluster" | "merge";
}

export class TopicPrioritizationService {
  prioritize(
    records: Array<{
      keyword: string;
      searchVolume: number;
      keywordDifficulty: number;
      trendVelocity: number;
      businessRelevance: number;
      conversionIntent: number;
      competitorGap: number;
      freshnessOpportunity: number;
      clusterValue: number;
      authorityFit: number;
    }>,
    existingContent: ExistingContentRecord[],
  ): PrioritizedTopic[] {
    return records
      .map((record) => {
        const cannibalization = assessCannibalization(record.keyword, existingContent);
        const score = scoreTopic({
          volume: record.searchVolume,
          difficulty: record.keywordDifficulty,
          trend: record.trendVelocity,
          businessRelevance: record.businessRelevance,
          conversionIntent: record.conversionIntent,
          competitorGap: record.competitorGap,
          freshness: record.freshnessOpportunity,
          clusterValue: record.clusterValue,
          authorityFit: record.authorityFit,
          cannibalizationRisk: cannibalization.riskScore,
        });

        return {
          keyword: record.keyword,
          totalScore: score.total,
          breakdown: score.breakdown,
          explanation: `${score.explanation} Cannibalization: ${cannibalization.recommendation}.`,
          recommendation: score.recommendation,
          cannibalizationRisk: cannibalization.riskScore,
          topicType:
            cannibalization.recommendation === "refresh_existing"
              ? "refresh_existing"
              : cannibalization.recommendation === "support_cluster"
                ? "support_cluster"
                : cannibalization.recommendation === "merge"
                  ? "merge"
                  : "new_article",
        };
      })
      .sort((left, right) => right.totalScore - left.totalScore);
  }
}
