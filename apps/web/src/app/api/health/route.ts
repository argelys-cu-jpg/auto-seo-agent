import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const dbModule = await import("@cookunity-seo-agent/db");
    const prisma = dbModule.prisma;
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.opportunity.count();

    return NextResponse.json({
      ok: true,
      service: "web",
      database: "connected",
      workflowSchema: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown health error";
    return NextResponse.json(
      {
        ok: false,
        service: "web",
        database: "error",
        workflowSchema: "missing_or_invalid",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
