import { createProviders } from "@cookunity-seo-agent/integrations";
import { log } from "@cookunity-seo-agent/shared";

export class KeywordIntelligenceService {
  private providers = createProviders();

  async discover(seedTerms: string[]): Promise<ReturnType<typeof this.aggregate>> {
    const [ahrefs, decay, trends, serp] = await Promise.all([
      this.providers.ahrefs.discoverKeywords(seedTerms),
      this.providers.gsc.discoverContentDecay(),
      this.providers.trends.discoverRisingTopics(seedTerms),
      this.providers.serp.discoverQuestions(seedTerms),
    ]);

    const result = this.aggregate([...ahrefs, ...decay, ...trends, ...serp]);
    log("info", "Keyword discovery complete", {
      service: "keyword-intelligence",
      candidateCount: result.length,
    });
    return result;
  }

  private aggregate(records: Awaited<ReturnType<typeof this.providers.ahrefs.discoverKeywords>>) {
    const byKeyword = new Map<string, (typeof records)[number]>();
    for (const record of records) {
      const key = record.keyword.toLowerCase();
      const existing = byKeyword.get(key);
      if (!existing || record.searchVolume > existing.searchVolume) {
        byKeyword.set(key, record);
      }
    }
    return [...byKeyword.values()];
  }
}
