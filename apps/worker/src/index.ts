import cron from "node-cron";
import { getConfig, log } from "@cookunity-seo-agent/shared";
import { runDiscoveryJob } from "./jobs/discovery-job";
import { runDraftJob } from "./jobs/draft-job";
import { runMonitoringJob } from "./jobs/monitoring-job";
import { runPublishJob } from "./jobs/publish-job";

const config = getConfig();

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
