import type { PerformanceMonitoringInput, PerformanceMonitoringOutput } from "@cookunity-seo-agent/shared";
import { BaseWorkflowAgent, type AgentContext } from "./base-agent";
import { MonitoringService } from "../services/monitoring-service";
import { OptimizationService } from "../services/optimization-service";

export class PerformanceMonitoringRefreshAgent extends BaseWorkflowAgent<
  PerformanceMonitoringInput,
  PerformanceMonitoringOutput
> {
  readonly name = "performance_monitoring_refresh" as const;
  private readonly monitoring = new MonitoringService();
  private readonly optimization = new OptimizationService();

  constructor() {
    super("refresh_draft:v1");
  }

  protected async run(
    input: PerformanceMonitoringInput,
    _context: AgentContext,
  ): Promise<PerformanceMonitoringOutput> {
    const snapshots = await this.monitoring.snapshot(input.urls);
    const tasks = snapshots.flatMap((snapshot) =>
      this.optimization.detect(snapshot.url, [
        {
          impressions: snapshot.impressions,
          ctr: snapshot.ctr,
          averagePosition: snapshot.averagePosition,
          conversions: snapshot.conversions,
        },
      ]),
    );

    return { tasks, snapshots };
  }
}
