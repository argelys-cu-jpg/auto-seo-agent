import { AutonomousSeoAgent } from "@cookunity-seo-agent/core";
import { log } from "@cookunity-seo-agent/shared";

export async function runDraftJob(): Promise<void> {
  const agent = new AutonomousSeoAgent();
  const result = await agent.runDraftPipeline();
  log("info", "Draft job finished", {
    service: "worker.draft",
    briefId: result.brief.id,
    draftId: result.draft.id,
  });
}
