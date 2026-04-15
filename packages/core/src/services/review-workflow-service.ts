import type { WorkflowState } from "@cookunity-seo-agent/shared";

export interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState | "rejected";
  allowed: boolean;
}

const transitions: Record<WorkflowState, Array<WorkflowState | "rejected">> = {
  discovered: ["scored"],
  scored: ["queued", "refresh_recommended"],
  queued: ["outline_generated"],
  outline_generated: ["draft_generated"],
  draft_generated: ["in_review"],
  in_review: ["revision_requested", "approved", "rejected"],
  revision_requested: ["draft_generated"],
  approved: ["published"],
  published: ["monitoring"],
  monitoring: ["refresh_recommended"],
  refresh_recommended: ["refreshed", "queued"],
  refreshed: ["in_review", "published"],
};

export class ReviewWorkflowService {
  transition(from: WorkflowState, to: WorkflowState | "rejected"): WorkflowTransition {
    return {
      from,
      to,
      allowed: transitions[from]?.includes(to) ?? false,
    };
  }

  requiresManualApproval(state: WorkflowState): boolean {
    return ["in_review", "approved"].includes(state);
  }

  canPublish(hasApproval: boolean): boolean {
    return hasApproval;
  }
}
