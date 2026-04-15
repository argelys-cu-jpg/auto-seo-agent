import { AutonomousSeoAgent } from "@cookunity-seo-agent/core";
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const agent = new AutonomousSeoAgent();
  const prioritized = await agent.runDiscovery(
    ["prepared meals", "meal delivery"],
    [
      {
        id: "existing_prepared_meals",
        title: "Prepared Meal Delivery Basics",
        primaryKeyword: "prepared meal delivery",
        secondaryKeywords: ["prepared meals"],
      },
    ],
  );

  return NextResponse.json({
    success: true,
    discovered: prioritized.length,
    topRecommendation: prioritized[0],
  });
}
