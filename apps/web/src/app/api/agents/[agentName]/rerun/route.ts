import { agentNames } from "@cookunity-seo-agent/shared";
import { NextResponse } from "next/server";
import { rerunAgent } from "../../../../../lib/agent-control";

export async function POST(
  request: Request,
  context: { params: Promise<{ agentName: string }> },
): Promise<NextResponse> {
  const { agentName } = await context.params;

  if (!agentNames.includes(agentName as (typeof agentNames)[number])) {
    return NextResponse.json(
      {
        success: false,
        message: `Unknown agent: ${agentName}`,
      },
      { status: 404 },
    );
  }

  try {
    const formData = await request.formData();
    const approved = formData.get("approved") === "true";
    const result = await rerunAgent(agentName as (typeof agentNames)[number], { approved });

    return NextResponse.json({
      success: true,
      executionMode: "same_app",
      runId: result.runId,
      agentName: result.agentName,
      idempotencyKey: result.selectedEnvelope.idempotencyKey,
      promptVersionId: result.selectedEnvelope.promptVersionId,
      attempts: result.selectedEnvelope.attempts,
      output: result.selectedEnvelope.output,
      auditEvents: result.auditEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown rerun error";
    return NextResponse.json(
      {
        success: false,
        executionMode: "same_app",
        agentName,
        message,
      },
      { status: 400 },
    );
  }
}
