import { NextResponse } from "next/server";

import { getDashboardData } from "../../../../lib/data";
import { searchCookunityBlog, toPublishedSearchItems } from "../../../../lib/published-search";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  const localItems = toPublishedSearchItems((await getDashboardData()).publishedInventory);
  if (!query) {
    return NextResponse.json({ items: localItems });
  }

  const liveItems = await searchCookunityBlog(query);
  const merged = new Map(localItems.map((item) => [item.slug, item]));

  for (const item of liveItems) {
    if (!merged.has(item.slug)) {
      merged.set(item.slug, item);
    }
  }

  const normalizedQuery = query.toLowerCase();
  const filtered = [...merged.values()].filter((item) =>
    [item.title, item.slug, item.preview?.titleTag ?? "", item.preview?.h1 ?? "", ...(item.preview?.targetKeywords ?? [])]
      .some((value) => value.toLowerCase().includes(normalizedQuery)),
  );

  return NextResponse.json({ items: filtered });
}
