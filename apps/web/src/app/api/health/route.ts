import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const dbModule = await import("@cookunity-seo-agent/db");
    const prisma = dbModule.prisma;
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      service: "web",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown health error";
    return NextResponse.json(
      {
        ok: false,
        service: "web",
        database: "error",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
