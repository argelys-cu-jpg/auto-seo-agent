import { createProviders } from "@cookunity-seo-agent/integrations";

export class MonitoringService {
  private providers = createProviders();

  async snapshot(urls: string[]): Promise<
    Array<{
      url: string;
      query: string;
      impressions: number;
      clicks: number;
      ctr: number;
      averagePosition: number;
      conversions: number;
    }>
  > {
    const [performance, conversions] = await Promise.all([
      this.providers.gsc.fetchPerformance(urls),
      this.providers.analytics.fetchConversions(urls),
    ]);

    const conversionMap = new Map(conversions.map((item) => [item.url, item.conversions]));
    return performance.map((row) => ({
      ...row,
      conversions: conversionMap.get(row.url) ?? row.conversions ?? 0,
    }));
  }
}
