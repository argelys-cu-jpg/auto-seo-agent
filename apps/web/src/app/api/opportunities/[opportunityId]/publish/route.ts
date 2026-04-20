import { NextResponse } from "next/server";
import { publishOpportunityFromGrid } from "../../../../../lib/workflow-grid-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  const params = await context.params;
  try {
    const result = await publishOpportunityFromGrid(
      params.opportunityId,
      process.env.ADMIN_EMAIL ?? "reviewer@cookunity.local",
    );
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to publish opportunity." },
      { status: 500 },
    );
  }
}
