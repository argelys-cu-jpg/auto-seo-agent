import { describe, expect, it } from "vitest";
import { scoreTopic } from "../packages/core/src/scoring/model";

describe("scoreTopic", () => {
  it("recommends write_now for strong business-aligned opportunities", () => {
    const result = scoreTopic({
      volume: 5400,
      difficulty: 21,
      trend: 18,
      businessRelevance: 96,
      conversionIntent: 90,
      competitorGap: 72,
      freshness: 48,
      clusterValue: 81,
      authorityFit: 90,
      cannibalizationRisk: 12,
    });

    expect(result.total).toBeGreaterThan(70);
    expect(result.recommendation).toBe("write_now");
  });

  it("recommends merge_or_decannibalize for high overlap", () => {
    const result = scoreTopic({
      volume: 2400,
      difficulty: 20,
      trend: 8,
      businessRelevance: 90,
      conversionIntent: 83,
      competitorGap: 55,
      freshness: 60,
      clusterValue: 70,
      authorityFit: 85,
      cannibalizationRisk: 82,
    });

    expect(result.recommendation).toBe("merge_or_decannibalize");
  });
});
