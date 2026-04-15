import { describe, expect, it } from "vitest";
import { assessCannibalization } from "../packages/core/src/guards/cannibalization";

describe("assessCannibalization", () => {
  it("flags near-duplicate topics for merge", () => {
    const result = assessCannibalization("healthy prepared meal delivery", [
      {
        id: "existing_1",
        title: "Healthy Prepared Meal Delivery Guide",
        primaryKeyword: "healthy prepared meal delivery",
        secondaryKeywords: ["prepared healthy meals"],
      },
    ]);

    expect(result.riskScore).toBeGreaterThanOrEqual(80);
    expect(result.recommendation).toBe("merge");
  });

  it("allows distinct topics as new articles", () => {
    const result = assessCannibalization("mediterranean prepared meals", [
      {
        id: "existing_1",
        title: "What Is Prepared Meal Delivery",
        primaryKeyword: "prepared meal delivery",
        secondaryKeywords: ["meal delivery"],
      },
    ]);

    expect(result.riskScore).toBeLessThan(60);
  });
});
