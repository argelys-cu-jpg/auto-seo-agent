import { NextResponse } from "next/server";
import {
  createOpportunityRecord,
  getGridOpportunityDetail,
  listGridControlPlane,
  runWorkflowForOpportunity,
} from "../../../lib/workflow-grid-store";

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

    const opportunity = await createOpportunityRecord({
      keyword: body.keyword.trim(),
      path: body.path ?? "blog",
      type: body.type ?? "keyword",
      ...(body.pageIdea?.trim() ? { pageIdea: body.pageIdea.trim() } : {}),
      ...(body.competitorPageUrl?.trim() ? { competitorPageUrl: body.competitorPageUrl.trim() } : {}),
    });

    try {
      const detail = await runWorkflowForOpportunity(opportunity.id);
      const rows = await listGridControlPlane();
      if (!rows.some((row) => row.id === opportunity.id)) {
        throw new Error("Opportunity was created but is missing from the grid list.");
      }
      return NextResponse.json({ success: true, result: detail });
    } catch (workflowError) {
      const detail = await getGridOpportunityDetail(opportunity.id);
      const rows = await listGridControlPlane();
      if (!rows.some((row) => row.id === opportunity.id)) {
        return NextResponse.json(
          {
            success: false,
            message:
              workflowError instanceof Error
                ? `Row creation did not persist to the grid: ${workflowError.message}`
                : "Row creation did not persist to the grid.",
          },
          { status: 500 },
        );
      }
      if (detail) {
        return NextResponse.json({
          success: true,
          result: detail,
          warning:
            workflowError instanceof Error
              ? workflowError.message
              : "Workflow generation failed after the row was created.",
        });
      }

      return NextResponse.json({
        success: true,
        result: {
          id: opportunity.id,
          keyword: opportunity.keyword,
          intent: opportunity.intent,
          path: opportunity.path,
          type: opportunity.type,
          rowStatus: opportunity.rowStatus,
          ...(opportunity.pageIdea ? { pageIdea: opportunity.pageIdea } : {}),
          ...(opportunity.competitorPageUrl ? { competitorPageUrl: opportunity.competitorPageUrl } : {}),
          updatedAt: opportunity.updatedAt.toISOString(),
          steps: [],
          auditLog: [],
          revisionNotes: [],
          publishResults: [],
        },
        warning:
          workflowError instanceof Error
            ? workflowError.message
            : "Workflow generation failed after the row was created.",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to create opportunity." },
      { status: 500 },
    );
  }
}
