import { NextResponse } from "next/server";
import { submitReviewForDraft } from "../../../../lib/workflow-grid-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ draftId: string }> },
): Promise<NextResponse> {
  const params = await context.params;
  try {
    const formData = await request.formData();
    const decision = String(formData.get("decision") ?? "request_revision");
    const notes = String(formData.get("notes") ?? "").trim();
    const approval = await submitReviewForDraft(
      params.draftId,
      decision as "approve" | "request_revision" | "reject",
      notes || null,
      process.env.ADMIN_EMAIL ?? "reviewer@cookunity.local",
    );

    return NextResponse.json({
      success: true,
      draftId: params.draftId,
      approvalId: approval.id,
      message: "Review action persisted to Prisma.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown review error";
    return NextResponse.json(
      {
        success: false,
        draftId: params.draftId,
        message,
      },
      { status: 400 },
    );
  }
}
