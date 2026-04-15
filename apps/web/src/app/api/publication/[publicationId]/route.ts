import { NextResponse } from "next/server";
import { publishApprovedDraft } from "../../../../lib/workflow-grid-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ publicationId: string }> },
): Promise<NextResponse> {
  const params = await context.params;
  try {
    await publishApprovedDraft(params.publicationId);
    return NextResponse.json({
      success: true,
      publicationId: params.publicationId,
      message: "Approved draft published and persisted.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown publication error";
    return NextResponse.json(
      {
        success: false,
        publicationId: params.publicationId,
        message,
      },
      { status: 400 },
    );
  }
}
