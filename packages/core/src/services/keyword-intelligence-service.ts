import { createProviders } from "@cookunity-seo-agent/integrations";
import { log } from "@cookunity-seo-agent/shared";

export class KeywordIntelligenceService {
  private providers = createProviders();

  async discover(seedTerms: string[]): Promise<ReturnType<typeof this.aggregate>> {
    const [ahrefs, decay, trends, serp] = await Promise.all([
      this.withFallback(
        "ahrefs.discoverKeywords",
        this.providers.ahrefs.discoverKeywords(seedTerms),
        [],
      ),
      this.withFallback(
        "gsc.discoverContentDecay",
        this.providers.gsc.discoverContentDecay(),
        [],
      ),
      this.withFallback(
        "trends.discoverRisingTopics",
        this.providers.trends.discoverRisingTopics(seedTerms),
        [],
      ),
      this.withFallback(
        "serp.discoverQuestions",
        this.providers.serp.discoverQuestions(seedTerms),
        [],
      ),
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

  private async withFallback<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
    try {
      return await this.withTimeout(label, promise, fallback);
    } catch (error) {
      log("warn", "Keyword discovery provider failed", {
        service: "keyword-intelligence",
        provider: label,
        error: error instanceof Error ? error.message : String(error),
      });
      return fallback;
    }
  }

  private withTimeout<T>(label: string, promise: Promise<T>, fallback: T, timeoutMs = 8000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        log("warn", "Keyword discovery provider timed out", {
          service: "keyword-intelligence",
          provider: label,
          timeoutMs,
        });
        resolve(fallback);
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
