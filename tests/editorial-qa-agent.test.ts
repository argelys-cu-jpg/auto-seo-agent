import { describe, expect, it } from "vitest";
import { EditorialQaAgent } from "../packages/core/src/agents/editorial-qa-agent";
import { mockBrief, mockDraft } from "../packages/shared/src/mock-data";

describe("EditorialQaAgent", () => {
  it("flags YMYL-adjacent topics for human review", async () => {
    const agent = new EditorialQaAgent();
    const result = await agent.execute(
      {
        brief: {
          ...mockBrief,
          primaryKeyword: "best prepared meal delivery for weight loss",
        },
        draft: mockDraft,
      },
      {
        runId: "run_1",
        entityId: "draft_1",
      },
    );

    expect(result.output.requiresHumanReview).toBe(true);
    expect(result.output.flags.some((flag) => flag.toLowerCase().includes("ymyl"))).toBe(true);
  });
});
