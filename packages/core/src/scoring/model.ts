import type { RecommendationType, TopicScoreBreakdown } from "@cookunity-seo-agent/shared";

export interface ScoreWeights {
  volume: number;
  difficultyInverse: number;
  trend: number;
  businessRelevance: number;
  conversionIntent: number;
  competitorGap: number;
  freshness: number;
  clusterValue: number;
  authorityFit: number;
}

export interface TopicScoringInput {
  volume: number;
  difficulty: number;
  trend: number;
  businessRelevance: number;
  conversionIntent: number;
  competitorGap: number;
  freshness: number;
  clusterValue: number;
  authorityFit: number;
  cannibalizationRisk?: number;
}

export interface ScoringResult {
  total: number;
  breakdown: TopicScoreBreakdown;
  explanation: string;
  recommendation: RecommendationType;
}

export const defaultScoreWeights: ScoreWeights = {
  volume: 0.14,
  difficultyInverse: 0.1,
  trend: 0.1,
  businessRelevance: 0.18,
  conversionIntent: 0.16,
  competitorGap: 0.1,
  freshness: 0.07,
  clusterValue: 0.08,
  authorityFit: 0.07,
};

function normalizeVolume(volume: number): number {
  return Math.min(100, Math.round(Math.log10(Math.max(volume, 1)) * 25));
}

function difficultyInverse(difficulty: number): number {
  return Math.max(0, 100 - difficulty);
}

function normalizeTrend(trend: number): number {
  return Math.min(100, Math.max(0, 50 + trend * 2));
}

export function scoreTopic(
  input: TopicScoringInput,
  weights: ScoreWeights = defaultScoreWeights,
): ScoringResult {
  const breakdown: TopicScoreBreakdown = {
    volumeScore: normalizeVolume(input.volume),
    difficultyInverseScore: difficultyInverse(input.difficulty),
    trendScore: normalizeTrend(input.trend),
    businessRelevanceScore: input.businessRelevance,
    conversionIntentScore: input.conversionIntent,
    competitorGapScore: input.competitorGap,
    freshnessScore: input.freshness,
    clusterValueScore: input.clusterValue,
    authorityFitScore: input.authorityFit,
  };

  const total =
    breakdown.volumeScore * weights.volume +
    breakdown.difficultyInverseScore * weights.difficultyInverse +
    breakdown.trendScore * weights.trend +
    breakdown.businessRelevanceScore * weights.businessRelevance +
    breakdown.conversionIntentScore * weights.conversionIntent +
    breakdown.competitorGapScore * weights.competitorGap +
    breakdown.freshnessScore * weights.freshness +
    breakdown.clusterValueScore * weights.clusterValue +
    breakdown.authorityFitScore * weights.authorityFit -
    (input.cannibalizationRisk ?? 0) * 0.12;

  let recommendation: RecommendationType = "monitor";
  if ((input.cannibalizationRisk ?? 0) > 65) {
    recommendation = "merge_or_decannibalize";
  } else if (input.freshness > 72 && input.volume > 2000) {
    recommendation = "refresh_existing";
  } else if (total >= 72) {
    recommendation = "write_now";
  } else if (input.clusterValue >= 70 && input.volume >= 500) {
    recommendation = "support_cluster";
  } else if (total < 40) {
    recommendation = "skip";
  }

  const explanation =
    `Total score ${total.toFixed(1)} driven by business relevance ${breakdown.businessRelevanceScore}, ` +
    `conversion intent ${breakdown.conversionIntentScore}, and volume ${breakdown.volumeScore}. ` +
    `Cannibalization risk penalty applied: ${input.cannibalizationRisk ?? 0}.`;

  return {
    total: Number(total.toFixed(2)),
    breakdown,
    explanation,
    recommendation,
  };
}
