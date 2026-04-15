import { OperationalWorkflowService, logOperationalResult } from "@cookunity-seo-agent/core";

export async function runPublishJob(): Promise<void> {
  const workflow = new OperationalWorkflowService();
  const published = await workflow.publishApproved();
  logOperationalResult("worker.publish", "Publish job finished", {
    publishedCount: published.length,
    entries: published,
  });
}
