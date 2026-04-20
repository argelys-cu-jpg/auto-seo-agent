import { NextResponse } from "next/server";
import { approveWorkflowStep } from "../../../../../../lib/workflow-grid-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ stepRunId: string }> },
) {
  const params = await context.params;
  try {
    const result = await approveWorkflowStep(
      params.stepRunId,
      process.env.ADMIN_EMAIL ?? "reviewer@cookunity.local",
    );
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to approve step." },
      { status: 500 },
    );
  }
}
