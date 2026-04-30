import { NextResponse } from "next/server";
import { rerunWorkflowStep } from "../../../../../../lib/workflow-grid-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ stepRunId: string }> },
) {
  const params = await context.params;
  try {
    let body: { note?: string } = {};
    try {
      const text = await request.text();
      if (text.trim().length > 0) {
        body = JSON.parse(text) as { note?: string };
      }
    } catch {
      body = {};
    }
    const result = await rerunWorkflowStep(
      params.stepRunId,
      process.env.ADMIN_EMAIL ?? "reviewer@cookunity.local",
      body.note?.trim() || undefined,
    );
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to rerun step." },
      { status: 500 },
    );
  }
}
