import { OperationalWorkflowService, logOperationalResult } from "@cookunity-seo-agent/core";

export async function runDraftJob(): Promise<void> {
  const workflow = new OperationalWorkflowService();
  const result = await workflow.draftNextTopic();
  logOperationalResult("worker.draft", "Draft job finished", {
    topicId: result?.topicId ?? null,
    draftId: result?.draftId ?? null,
    reviewDocUrl: result?.reviewDocUrl ?? null,
  });
}
