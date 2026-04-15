import { OperationalWorkflowService, logOperationalResult } from "@cookunity-seo-agent/core";

export async function runMonitoringJob(): Promise<void> {
  const workflow = new OperationalWorkflowService();
  const result = await workflow.monitorAndPersist();
  logOperationalResult("worker.monitoring", "Monitoring job finished", result);
}
