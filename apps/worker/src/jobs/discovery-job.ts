import { AutonomousSeoAgent } from "@cookunity-seo-agent/core";
import { log } from "@cookunity-seo-agent/shared";

export async function runDiscoveryJob(): Promise<void> {
  const agent = new AutonomousSeoAgent();
  const result = await agent.runDiscovery(
    ["prepared meals", "healthy meal delivery", "mediterranean meals"],
    [
      {
        id: "pub_meal_delivery_basics",
        title: "What Is Prepared Meal Delivery?",
        primaryKeyword: "prepared meal delivery",
        secondaryKeywords: ["prepared meals", "meal delivery"],
      },
    ],
  );

  log("info", "Discovery job finished", {
    service: "worker.discovery",
    candidateCount: result.length,
    topKeyword: result[0]?.keyword,
  });
}
