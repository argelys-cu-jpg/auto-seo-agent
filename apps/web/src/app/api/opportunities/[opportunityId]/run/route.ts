import { NextResponse } from "next/server";
import { runWorkflowForOpportunity } from "../../../../../lib/workflow-grid-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  const params = await context.params;
  try {
    const result = await runWorkflowForOpportunity(params.opportunityId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to run workflow." },
      { status: 500 },
    );
  }
}
