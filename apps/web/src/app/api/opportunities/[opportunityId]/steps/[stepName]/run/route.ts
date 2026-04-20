import { NextResponse } from "next/server";
import { runWorkflowStepForOpportunity } from "../../../../../../../lib/workflow-grid-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ opportunityId: string; stepName: string }> },
) {
  const params = await context.params;
  try {
    const stepName = params.stepName as
      | "discovery"
      | "prioritization"
      | "brief"
      | "draft"
      | "qa"
      | "publish";
    const result = await runWorkflowStepForOpportunity(params.opportunityId, stepName);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to run step." },
      { status: 500 },
    );
  }
}
