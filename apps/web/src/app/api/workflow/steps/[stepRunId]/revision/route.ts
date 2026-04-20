import { NextResponse } from "next/server";
import { requestWorkflowStepRevision } from "../../../../../../lib/workflow-grid-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ stepRunId: string }> },
) {
  const params = await context.params;
  try {
    const body = (await request.json()) as { note?: string };
    const note = body.note?.trim();
    if (!note) {
      return NextResponse.json({ success: false, message: "Revision note is required." }, { status: 400 });
    }

    const result = await requestWorkflowStepRevision(
      params.stepRunId,
      process.env.ADMIN_EMAIL ?? "reviewer@cookunity.local",
      note,
    );
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to request revision." },
      { status: 500 },
    );
  }
}
