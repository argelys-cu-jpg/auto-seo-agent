import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");

  if (!src) {
    return NextResponse.json({ error: "Missing src query parameter." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "Only http and https image URLs are supported." }, { status: 400 });
  }

  try {
    const response = await fetch(target, {
      headers: {
        "user-agent": "CookUnity Image Cropper",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Image fetch failed with status ${response.status}.` }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Remote URL did not return an image." }, { status: 415 });
    }

    const data = await response.arrayBuffer();
    return new NextResponse(data, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to fetch the remote image." }, { status: 502 });
  }
}
