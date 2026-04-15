import { NextRequest, NextResponse } from "next/server";

type Candidate = {
  id: string;
  src: string;
  description: string;
};

const SUPPORTED_HOST_MARKERS = ["amazonaws.com", "airops.com"];

export async function GET(request: NextRequest) {
  const pageUrl = request.nextUrl.searchParams.get("pageUrl");

  if (!pageUrl) {
    return NextResponse.json({ error: "Missing pageUrl query parameter." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(pageUrl);
  } catch {
    return NextResponse.json({ error: "Invalid page URL." }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "Only http and https page URLs are supported." }, { status: 400 });
  }

  try {
    const response = await fetch(target, {
      headers: {
        "user-agent": "CookUnity Image Cropper",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Page fetch failed with status ${response.status}.` }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ error: "The provided URL did not return an HTML page." }, { status: 415 });
    }

    const html = await response.text();
    const pageTitle = extractTitle(html);
    const images = extractCandidatesFromHtml(html, target);

    return NextResponse.json({ pageTitle, images });
  } catch {
    return NextResponse.json({ error: "Unable to fetch or parse the page." }, { status: 502 });
  }
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtmlEntities(match?.[1] ?? "").trim();
}

function extractCandidatesFromHtml(html: string, baseUrl: URL) {
  const tagMatches = html.match(/<img\b[^>]*>/gi) ?? [];
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  for (const [index, tag] of tagMatches.entries()) {
    const resolvedSrc = resolveImageSource(tag, baseUrl);
    if (!resolvedSrc || !isSupportedHost(resolvedSrc) || seen.has(resolvedSrc)) {
      continue;
    }

    seen.add(resolvedSrc);
    candidates.push({
      id: `page-${index}-${Date.now()}`,
      src: resolvedSrc,
      description: buildDescription(tag, resolvedSrc, index + 1),
    });
  }

  return candidates;
}

function resolveImageSource(tag: string, baseUrl: URL) {
  const raw =
    getAttribute(tag, "src") ||
    getAttribute(tag, "data-src") ||
    getAttribute(tag, "data-original") ||
    getAttribute(tag, "data-lazy-src") ||
    firstSrcFromSrcset(getAttribute(tag, "srcset")) ||
    firstSrcFromSrcset(getAttribute(tag, "data-srcset"));

  if (!raw) {
    return "";
  }

  try {
    return new URL(decodeHtmlEntities(raw), baseUrl).toString();
  } catch {
    return "";
  }
}

function buildDescription(tag: string, src: string, sequence: number) {
  return sanitizeDescription(
    decodeHtmlEntities(getAttribute(tag, "alt") || getAttribute(tag, "title") || "") ||
      guessDescriptionFromText(lastPathSegment(src)) ||
      `blog image ${sequence}`,
  );
}

function getAttribute(tag: string, attribute: string) {
  const pattern = new RegExp(`${attribute}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? "";
}

function firstSrcFromSrcset(value: string) {
  const firstEntry = value.split(",")[0]?.trim() ?? "";
  return firstEntry.split(/\s+/)[0] ?? "";
}

function isSupportedHost(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return SUPPORTED_HOST_MARKERS.some((marker) => hostname.includes(marker));
  } catch {
    return false;
  }
}

function lastPathSegment(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] ?? "");
  } catch {
    return url;
  }
}

function guessDescriptionFromText(value: string) {
  return value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(img|image|photo|hero|banner|cookunity)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeDescription(description: string) {
  const cleaned = description.trim().replace(/\s+/g, " ").slice(0, 96).trim();
  return cleaned || "cookunity image";
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
