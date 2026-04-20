import cron from "node-cron";
import { getConfig, log } from "@cookunity-seo-agent/shared";
import { OpportunityWorkflowService } from "@cookunity-seo-agent/core";
import { runDiscoveryJob } from "./jobs/discovery-job";
import { runDraftJob } from "./jobs/draft-job";
import { runMonitoringJob } from "./jobs/monitoring-job";
import { runPublishJob } from "./jobs/publish-job";
import { attachQueueEvents, createWorkflowWorker } from "./jobs/queue";

const config = getConfig();
const opportunityWorkflow = new OpportunityWorkflowService();

log("info", "Worker booting", {
  service: "worker",
  discoveryCron: config.DISCOVERY_CRON,
  monitoringCron: config.MONITORING_CRON,
  refreshCron: config.REFRESH_CRON,
});

cron.schedule(config.DISCOVERY_CRON, () => {
  void runDiscoveryJob();
});

cron.schedule(config.MONITORING_CRON, () => {
  void runMonitoringJob();
});

cron.schedule(config.REFRESH_CRON, () => {
  void runDraftJob();
});

cron.schedule("15 10 * * 1-5", () => {
  void runPublishJob();
});

const workflowWorker = createWorkflowWorker(async (job) => {
  if (job.name === "opportunity:run_workflow") {
    await opportunityWorkflow.runWorkflow(String(job.data.opportunityId));
    return;
  }
  if (job.name === "opportunity:run_step") {
    await opportunityWorkflow.executeStep(
      String(job.data.opportunityId),
      job.data.stepName as "discovery" | "prioritization" | "brief" | "draft" | "qa" | "publish",
      {
        trigger: "worker_step_run",
        ...(job.data.revisionNote ? { revisionNote: String(job.data.revisionNote) } : {}),
      },
    );
    return;
  }
  if (job.name === "opportunity:publish") {
    await opportunityWorkflow.publishOpportunity(
      String(job.data.opportunityId),
      process.env.ADMIN_EMAIL ?? "reviewer@cookunity.local",
    );
    return;
  }

  throw new Error(`Unsupported workflow job: ${job.name}`);
});

attachQueueEvents(workflowWorker);
