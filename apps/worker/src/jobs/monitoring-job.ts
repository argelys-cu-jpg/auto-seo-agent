import { AutonomousSeoAgent } from "@cookunity-seo-agent/core";
import { log } from "@cookunity-seo-agent/shared";

export async function runMonitoringJob(): Promise<void> {
  const agent = new AutonomousSeoAgent();
  const tasks = await agent.runMonitoring([
    "https://www.cookunity.com/blog/healthy-prepared-meal-delivery-guide",
  ]);
  log("info", "Monitoring job finished", {
    service: "worker.monitoring",
    recommendationCount: tasks.length,
  });
}
