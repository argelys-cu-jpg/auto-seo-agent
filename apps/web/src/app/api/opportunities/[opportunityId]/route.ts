import { NextResponse } from "next/server";
import { OpportunityWorkflowService } from "@cookunity-seo-agent/core";
import { getGridOpportunityDetail } from "../../../../lib/workflow-grid-store";

const service = new OpportunityWorkflowService();

export async function GET(
  _request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  const params = await context.params;
  const result = await getGridOpportunityDetail(params.opportunityId);
  if (!result) {
    return NextResponse.json({ success: false, message: "Opportunity not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true, result });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  try {
    const params = await context.params;
    const body = (await request.json()) as {
      keyword?: string;
      path?: "blog" | "landing_page";
      type?: "keyword" | "page_idea" | "competitor_page" | "lp_optimization";
      pageIdea?: string | null;
      competitorPageUrl?: string | null;
    };

    await service.updateOpportunity(params.opportunityId, body);
    const result = await getGridOpportunityDetail(params.opportunityId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to update opportunity." },
      { status: 500 },
    );
  }
}
