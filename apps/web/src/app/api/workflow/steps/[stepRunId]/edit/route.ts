import { NextResponse } from "next/server";
import { saveWorkflowStepEdit } from "../../../../../../lib/workflow-grid-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ stepRunId: string }> },
) {
  const params = await context.params;
  try {
    const body = (await request.json()) as { manualOutput?: unknown };
    if (!body.manualOutput) {
      return NextResponse.json({ success: false, message: "Manual output is required." }, { status: 400 });
    }
    const result = await saveWorkflowStepEdit(
      params.stepRunId,
      process.env.ADMIN_EMAIL ?? "reviewer@cookunity.local",
      body.manualOutput,
    );
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to save manual edit." },
      { status: 500 },
    );
  }
}
