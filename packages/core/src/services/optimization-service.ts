import type { OptimizationTask } from "@cookunity-seo-agent/shared";

export class OptimizationService {
  detect(publicationId: string, snapshots: Array<{ impressions: number; ctr: number; averagePosition: number; conversions: number }>): OptimizationTask[] {
    const latest = snapshots.at(-1);
    if (!latest) return [];

    const tasks: OptimizationTask[] = [];
    if (latest.impressions > 5000 && latest.ctr < 0.02) {
      tasks.push({
        id: `opt_ctr_${publicationId}`,
        publicationId,
        type: "improve_ctr",
        priority: "high",
        reason: "High impressions but low CTR indicate title/meta mismatch with search intent.",
        actions: [
          "Test a tighter title tag",
          "Refresh meta description",
          "Add a stronger featured snippet section near the top",
        ],
        metricsContext: latest,
        createdAt: new Date().toISOString(),
      });
    }

    if (latest.averagePosition > 12) {
      tasks.push({
        id: `opt_links_${publicationId}`,
        publicationId,
        type: "strengthen_internal_links",
        priority: "medium",
        reason: "Ranking outside page one suggests the article may need stronger internal authority signals.",
        actions: [
          "Add cluster-supporting internal links",
          "Expand FAQ coverage for missing questions",
        ],
        metricsContext: latest,
        createdAt: new Date().toISOString(),
      });
    }

    if (latest.conversions < 3 && latest.impressions > 2000) {
      tasks.push({
        id: `opt_refresh_${publicationId}`,
        publicationId,
        type: "refresh_article",
        priority: "medium",
        reason: "Traffic is not converting efficiently against article reach.",
        actions: [
          "Improve CTA placement",
          "Sharpen consideration-stage comparison framing",
          "Align internal links to higher-intent product paths",
        ],
        metricsContext: latest,
        createdAt: new Date().toISOString(),
      });
    }

    return tasks;
  }
}
