import { NextResponse } from "next/server";

import { fetchCookunityBlogPreview } from "../../../../lib/published-search";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim() ?? "";

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const preview = await fetchCookunityBlogPreview(url);
  if (!preview) {
    return NextResponse.json({ error: "Preview unavailable" }, { status: 404 });
  }

  return NextResponse.json({ preview });
}
