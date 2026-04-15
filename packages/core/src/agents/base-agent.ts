import { log, type AgentExecutionEnvelope, type AgentName } from "@cookunity-seo-agent/shared";

export interface AgentContext {
  runId: string;
  entityId: string;
  attempt?: number;
}

export interface WorkflowAgent<TInput, TOutput> {
  readonly name: AgentName;
  readonly promptVersionId: string | undefined;
  execute(input: TInput, context: AgentContext): Promise<AgentExecutionEnvelope<TInput, TOutput>>;
}

export abstract class BaseWorkflowAgent<TInput, TOutput>
  implements WorkflowAgent<TInput, TOutput>
{
  abstract readonly name: AgentName;
  readonly promptVersionId: string | undefined;

  constructor(promptVersionId?: string) {
    this.promptVersionId = promptVersionId;
  }

  async execute(
    input: TInput,
    context: AgentContext,
  ): Promise<AgentExecutionEnvelope<TInput, TOutput>> {
    const attempts = context.attempt ?? 1;
    const idempotencyKey = `${this.name}:${context.runId}:${context.entityId}`;
    log("info", "Agent execution started", {
      service: "workflow-agent",
      agent: this.name,
      runId: context.runId,
      entityId: context.entityId,
      attempts,
      idempotencyKey,
    });

    const output = await this.run(input, context);
    const envelope: AgentExecutionEnvelope<TInput, TOutput> = {
      agent: this.name,
      idempotencyKey,
      ...(this.promptVersionId ? { promptVersionId: this.promptVersionId } : {}),
      input,
      output,
      attempts,
      executedAt: new Date().toISOString(),
    };

    log("info", "Agent execution completed", {
      service: "workflow-agent",
      agent: this.name,
      runId: context.runId,
      entityId: context.entityId,
      attempts,
      idempotencyKey,
    });

    return envelope;
  }

  protected abstract run(input: TInput, context: AgentContext): Promise<TOutput>;
}
