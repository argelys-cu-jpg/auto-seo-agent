import { NextResponse } from "next/server";
import { createOpportunityAndRunWorkflow } from "../../../lib/workflow-grid-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      keyword?: string;
      path?: "blog" | "landing_page";
      type?: "keyword" | "page_idea" | "competitor_page" | "lp_optimization";
      pageIdea?: string;
      competitorPageUrl?: string;
    };

    if (!body.keyword?.trim()) {
      return NextResponse.json({ success: false, message: "Keyword is required." }, { status: 400 });
    }

    const result = await createOpportunityAndRunWorkflow({
      keyword: body.keyword.trim(),
      path: body.path ?? "blog",
      type: body.type ?? "keyword",
      ...(body.pageIdea?.trim() ? { pageIdea: body.pageIdea.trim() } : {}),
      ...(body.competitorPageUrl?.trim() ? { competitorPageUrl: body.competitorPageUrl.trim() } : {}),
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to create opportunity." },
      { status: 500 },
    );
  }
}
