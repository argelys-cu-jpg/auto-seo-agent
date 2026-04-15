import { NextResponse } from "next/server";
import { createKeywordAndRunWorkflow } from "../../../../lib/workflow-grid-store";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const keyword = String(formData.get("keyword") ?? "").trim();

    if (!keyword) {
      return NextResponse.redirect(new URL("/grid?error=missing-keyword", request.url));
    }

    await createKeywordAndRunWorkflow(keyword);
    return NextResponse.redirect(new URL("/grid?created=1", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown grid creation error";
    return NextResponse.redirect(
      new URL(`/grid?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
