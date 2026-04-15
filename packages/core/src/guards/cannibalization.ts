export interface ExistingContentRecord {
  id: string;
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  cluster?: string;
}

export interface CannibalizationAssessment {
  riskScore: number;
  matches: Array<{ contentId: string; overlap: number; reason: string }>;
  recommendation: "safe_new_article" | "refresh_existing" | "support_cluster" | "merge";
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  const common = [...a].filter((token) => b.has(token)).length;
  return common / Math.max(a.size, b.size, 1);
}

export function assessCannibalization(
  candidateKeyword: string,
  existingContent: ExistingContentRecord[],
): CannibalizationAssessment {
  const candidateTokens = tokenize(candidateKeyword);
  const matches = existingContent
    .map((item) => {
      const primaryOverlap = overlapRatio(candidateTokens, tokenize(item.primaryKeyword));
      const secondaryOverlap = Math.max(
        0,
        ...item.secondaryKeywords.map((keyword) => overlapRatio(candidateTokens, tokenize(keyword))),
      );
      const overlap = Math.max(primaryOverlap, secondaryOverlap);
      return {
        contentId: item.id,
        overlap,
        reason:
          overlap >= 0.75
            ? "Near-duplicate intent with existing content."
            : overlap >= 0.45
              ? "Related topic with possible support-cluster or refresh opportunity."
              : "Low overlap.",
      };
    })
    .filter((item) => item.overlap >= 0.2)
    .sort((left, right) => right.overlap - left.overlap);

  const highest = matches[0]?.overlap ?? 0;
  let recommendation: CannibalizationAssessment["recommendation"] = "safe_new_article";
  if (highest >= 0.8) {
    recommendation = "merge";
  } else if (highest >= 0.6) {
    recommendation = "refresh_existing";
  } else if (highest >= 0.35) {
    recommendation = "support_cluster";
  }

  return {
    riskScore: Math.round(highest * 100),
    matches,
    recommendation,
  };
}
