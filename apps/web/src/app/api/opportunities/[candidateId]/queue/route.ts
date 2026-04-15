import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ candidateId: string }> },
): Promise<NextResponse> {
  const params = await context.params;
  return NextResponse.json({
    success: true,
    candidateId: params.candidateId,
    message: "Candidate queued for outline generation.",
  });
}
