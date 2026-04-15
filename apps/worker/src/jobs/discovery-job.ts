import { OperationalWorkflowService, logOperationalResult } from "@cookunity-seo-agent/core";

export async function runDiscoveryJob(): Promise<void> {
  const workflow = new OperationalWorkflowService();
  const result = await workflow.discoverAndPersist([
    "prepared meals",
    "healthy meal delivery",
    "mediterranean meals",
    "ready to eat meals",
  ]);

  logOperationalResult("worker.discovery", "Discovery job finished", {
    candidateCount: result.count,
    topKeyword: result.topKeyword,
  });
}
