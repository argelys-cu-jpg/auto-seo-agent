import type { DashboardPublicationSummary } from "./data";

export interface PublishedSearchItem extends DashboardPublicationSummary {
  source: "database" | "live_blog";
  liveUrl: string;
}

export interface PublishedSearchPreview {
  title: string;
  h1: string;
  metaDescription: string;
  html: string;
}

function normalizeSlug(slug: string) {
  return slug.replace(/^\/+|\/+$/g, "");
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractMeta(html: string, name: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return stripHtml(match[1]);
    }
  }
  return "";
}

function extractParagraphs(html: string) {
  const matches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  return matches
    .map((match) => stripHtml(match[1] ?? ""))
    .filter(Boolean)
    .slice(0, 4);
}

async function fetchWordPressSearch(query: string, base: string) {
  const url = `${base}?search=${encodeURIComponent(query)}&per_page=12&_fields=slug,link,title.rendered`;
  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) {
    throw new Error(`WordPress search failed: ${response.status}`);
  }

  const body = (await response.json()) as Array<{ slug?: string; link?: string; title?: { rendered?: string } }>;
  return body
    .filter((item) => item.slug && item.link && item.title?.rendered)
    .map((item) => ({
      id: `live_${normalizeSlug(item.slug!)}`,
      slug: normalizeSlug(item.slug!),
      status: "published",
      title: stripHtml(item.title!.rendered!),
      source: "live_blog" as const,
      liveUrl: item.link!,
      metricSnapshots: [],
      optimizationTasks: [],
    }));
}

async function fetchSearchHtml(query: string) {
  const response = await fetch(`https://www.cookunity.com/blog?s=${encodeURIComponent(query)}`, {
    next: { revalidate: 900 },
  });
  if (!response.ok) {
    throw new Error(`Blog search page failed: ${response.status}`);
  }

  const html = await response.text();
  const linkMatches = [...html.matchAll(/<a[^>]+href=["']https:\/\/www\.cookunity\.com\/blog\/([^"'#?]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const results = new Map<string, PublishedSearchItem>();

  for (const match of linkMatches) {
    const slug = normalizeSlug(match[1] ?? "");
    const title = stripHtml(match[2] ?? "");
    if (!slug || !title || title.length < 4) {
      continue;
    }
    results.set(slug, {
      id: `live_${slug}`,
      slug,
      status: "published",
      title,
      source: "live_blog",
      liveUrl: `https://www.cookunity.com/blog/${slug}`,
      metricSnapshots: [],
      optimizationTasks: [],
    });
    if (results.size >= 12) {
      break;
    }
  }

  return [...results.values()];
}

export function toPublishedSearchItems(items: DashboardPublicationSummary[]): PublishedSearchItem[] {
  return items.map((item) => ({
    ...item,
    source: item.source ?? "database",
    liveUrl: item.liveUrl ?? `https://www.cookunity.com/blog/${item.slug}`,
  }));
}

export async function searchCookunityBlog(query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [] as PublishedSearchItem[];
  }

  const attempts = [
    () => fetchWordPressSearch(normalizedQuery, "https://www.cookunity.com/wp-json/wp/v2/posts"),
    () => fetchWordPressSearch(normalizedQuery, "https://www.cookunity.com/blog/wp-json/wp/v2/posts"),
    () => fetchSearchHtml(normalizedQuery),
  ];

  for (const attempt of attempts) {
    try {
      const results = await attempt();
      if (results.length > 0) {
        return results;
      }
    } catch {
      // Try the next source.
    }
  }

  return [] as PublishedSearchItem[];
}

export async function fetchCookunityBlogPreview(url: string): Promise<PublishedSearchPreview | null> {
  if (!url.startsWith("https://www.cookunity.com/blog/")) {
    return null;
  }

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const title =
    extractMeta(html, "og:title") ||
    stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const h1 = stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "") || title;
  const metaDescription = extractMeta(html, "description") || extractMeta(html, "og:description");
  const paragraphs = extractParagraphs(html);

  return {
    title,
    h1,
    metaDescription,
    html: [
      `<article>`,
      h1 ? `<h1>${escapeHtml(h1)}</h1>` : "",
      ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
      `</article>`,
    ].join(""),
  };
}
