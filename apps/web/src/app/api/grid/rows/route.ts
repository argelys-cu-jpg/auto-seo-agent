import { NextResponse } from "next/server";
import {
  createKeywordAndRunWorkflow,
  listGridControlPlane,
} from "../../../../lib/workflow-grid-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  try {
    const rows = await listGridControlPlane();
    return NextResponse.json(
      { success: true, rows },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to load grid rows.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const keyword = String(formData.get("keyword") ?? "").trim();
    const path = String(formData.get("path") ?? "blog").trim() as "blog" | "landing_page";
    const type = String(formData.get("type") ?? "keyword").trim() as
      | "keyword"
      | "page_idea"
      | "competitor_page"
      | "lp_optimization";
    const pageIdea = String(formData.get("pageIdea") ?? "").trim();
    const competitorPageUrl = String(formData.get("competitorPageUrl") ?? "").trim();

    if (!keyword) {
      return NextResponse.redirect(new URL("/grid?error=missing-keyword", request.url));
    }

    await createKeywordAndRunWorkflow({
      keyword,
      path,
      type,
      ...(pageIdea ? { pageIdea } : {}),
      ...(competitorPageUrl ? { competitorPageUrl } : {}),
    });
    return NextResponse.redirect(new URL("/grid?created=1", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown grid creation error";
    return NextResponse.redirect(
      new URL(`/grid?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
