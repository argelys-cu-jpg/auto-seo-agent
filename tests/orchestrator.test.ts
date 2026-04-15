import { describe, expect, it } from "vitest";
import { WorkflowOrchestrator } from "../packages/core/src/orchestration/workflow-orchestrator";

describe("WorkflowOrchestrator", () => {
  it("blocks publishing without human approval", () => {
    const orchestrator = new WorkflowOrchestrator();
    expect(() => orchestrator.requireApproval(false)).toThrow(/human approval/i);
  });

  it("selects the highest ranked topic from prioritized output", () => {
    const orchestrator = new WorkflowOrchestrator();
    const topic = orchestrator.selectPrimaryTopic([
      {
        keyword: "healthy prepared meal delivery",
        totalScore: 82,
        explanation: "Top pick",
        recommendation: "write_now",
        cannibalizationRisk: 12,
        topicType: "new_article",
        breakdown: {
          volumeScore: 80,
          difficultyInverseScore: 79,
          trendScore: 65,
          businessRelevanceScore: 96,
          conversionIntentScore: 89,
          competitorGapScore: 71,
          freshnessScore: 50,
          clusterValueScore: 82,
          authorityFitScore: 92,
        },
      },
    ]);

    expect(topic.keyword).toBe("healthy prepared meal delivery");
  });
});
