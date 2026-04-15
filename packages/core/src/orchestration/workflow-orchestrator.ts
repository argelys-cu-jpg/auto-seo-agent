import {
  type AgentName,
  type ContentBriefAgentOutput,
  type EditorialQaOutput,
  type PerformanceMonitoringOutput,
  type PrioritizedTopicRecord,
  type PublishingAgentOutput,
  type WorkflowEvent,
} from "@cookunity-seo-agent/shared";
import { InMemoryAuditRepository, type AuditRepository } from "./audit";

type OrchestratorState =
  | "discovered"
  | "scored"
  | "queued"
  | "outline_generated"
  | "draft_generated"
  | "in_review"
  | "approved"
  | "published"
  | "monitoring"
  | "refresh_recommended";

export class WorkflowOrchestrator {
  constructor(private readonly auditRepository: AuditRepository = new InMemoryAuditRepository()) {}

  async recordTransition(args: {
    runId: string;
    entityId: string;
    entityType: string;
    agent: AgentName;
    toState: OrchestratorState;
    fromState?: string;
    approvedByHuman?: boolean;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const event: WorkflowEvent = {
      runId: args.runId,
      entityId: args.entityId,
      entityType: args.entityType,
      fromState: args.fromState,
      toState: args.toState,
      agent: args.agent,
      approvedByHuman: args.approvedByHuman ?? false,
      occurredAt: new Date().toISOString(),
      details: args.details ?? {},
    };
    await this.auditRepository.record(event);
  }

  requireApproval(approved: boolean): void {
    if (!approved) {
      throw new Error("Publishing blocked by orchestrator: human approval is required.");
    }
  }

  selectPrimaryTopic(rankedTopics: PrioritizedTopicRecord[]): PrioritizedTopicRecord {
    const topic = rankedTopics[0];
    if (!topic) {
      throw new Error("No prioritized topics available.");
    }
    return topic;
  }

  shouldRouteToReview(qa: EditorialQaOutput): boolean {
    return qa.requiresHumanReview || !qa.passed;
  }

  summarizeDraftPackage(args: {
    brief: ContentBriefAgentOutput["brief"];
    qa: EditorialQaOutput;
  }): { reviewReady: boolean; flags: string[] } {
    return {
      reviewReady: args.qa.passed,
      flags: args.qa.flags,
    };
  }

  summarizeMonitoring(output: PerformanceMonitoringOutput): {
    recommendationCount: number;
    urls: string[];
  } {
    return {
      recommendationCount: output.tasks.length,
      urls: output.snapshots.map((snapshot) => snapshot.url),
    };
  }

  summarizePublish(output: PublishingAgentOutput): {
    entryId: string;
    documentId?: string;
  } {
    return {
      entryId: output.entryId,
      documentId: output.documentId,
    };
  }
}
