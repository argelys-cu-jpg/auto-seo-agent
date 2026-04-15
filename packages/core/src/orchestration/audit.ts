import { log, type WorkflowEvent } from "@cookunity-seo-agent/shared";

export interface AuditRepository {
  record(event: WorkflowEvent): Promise<void>;
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly events: WorkflowEvent[] = [];

  async record(event: WorkflowEvent): Promise<void> {
    this.events.push(event);
    log("info", "Workflow event recorded", {
      service: "audit",
      runId: event.runId,
      entityId: event.entityId,
      agent: event.agent,
      toState: event.toState,
    });
  }

  all(): WorkflowEvent[] {
    return [...this.events];
  }
}
