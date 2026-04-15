import {
  log,
  mockTopicCandidates,
  type PerformanceMonitoringInput,
  type PublishingAgentInput,
} from "@cookunity-seo-agent/shared";
import { KeywordDiscoveryAgent } from "../agents/keyword-discovery-agent";
import { TopicPrioritizationAgent } from "../agents/topic-prioritization-agent";
import { ContentBriefOutlineAgent } from "../agents/content-brief-outline-agent";
import { ArticleDraftingAgent } from "../agents/article-drafting-agent";
import { EditorialQaAgent } from "../agents/editorial-qa-agent";
import { PublishingAgent } from "../agents/publishing-agent";
import { PerformanceMonitoringRefreshAgent } from "../agents/performance-monitoring-refresh-agent";
import type { ExistingContentRecord } from "../guards/cannibalization";
import { withRetry } from "../orchestration/retry";
import { WorkflowOrchestrator } from "../orchestration/workflow-orchestrator";

export class AutonomousSeoAgent {
  private readonly orchestrator = new WorkflowOrchestrator();
  private readonly keywordDiscoveryAgent = new KeywordDiscoveryAgent();
  private readonly topicPrioritizationAgent = new TopicPrioritizationAgent();
  private readonly contentBriefOutlineAgent = new ContentBriefOutlineAgent();
  private readonly articleDraftingAgent = new ArticleDraftingAgent();
  private readonly editorialQaAgent = new EditorialQaAgent();
  private readonly publishingAgent = new PublishingAgent();
  private readonly performanceMonitoringRefreshAgent = new PerformanceMonitoringRefreshAgent();

  async runDiscovery(seedTerms: string[], existingContent: ExistingContentRecord[]) {
    const runId = `run_discovery_${Date.now()}`;
    const entityId = "discovery_batch";

    const discovery = await withRetry(
      (attempt) =>
        this.keywordDiscoveryAgent.execute(
          {
            seedTerms,
            existingInventory: existingContent,
          },
          { runId, entityId, attempt },
        ),
      3,
    );

    await this.orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "keyword_batch",
      agent: discovery.agent,
      toState: "discovered",
      details: { candidateCount: discovery.output.candidates.length },
    });

    const prioritization = await withRetry(
      (attempt) =>
        this.topicPrioritizationAgent.execute(
          {
            candidates: discovery.output.candidates,
            existingInventory: existingContent,
          },
          { runId, entityId, attempt },
        ),
      3,
    );

    await this.orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "keyword_batch",
      agent: prioritization.agent,
      fromState: "discovered",
      toState: "scored",
      details: { rankedCount: prioritization.output.rankedTopics.length },
    });

    log("info", "Orchestrated discovery run finished", {
      service: "autonomous-agent",
      runId,
      candidateCount: prioritization.output.rankedTopics.length,
    });

    return prioritization.output.rankedTopics;
  }

  async runDraftPipeline(topicKeyword = mockTopicCandidates[0]?.keyword ?? "healthy prepared meal delivery") {
    const runId = `run_draft_${Date.now()}`;
    const topic = {
      keyword: topicKeyword,
      totalScore: 80,
      explanation: "Mock prioritized topic.",
      recommendation: "write_now" as const,
      cannibalizationRisk: 12,
      topicType: "new_article" as const,
      breakdown: {
        volumeScore: 78,
        difficultyInverseScore: 79,
        trendScore: 68,
        businessRelevanceScore: 95,
        conversionIntentScore: 89,
        competitorGapScore: 70,
        freshnessScore: 48,
        clusterValueScore: 82,
        authorityFitScore: 91,
      },
    };
    const entityId = topic.keyword;

    await this.orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "topic_candidate",
      agent: "topic_prioritization",
      toState: "queued",
      details: { recommendation: topic.recommendation },
    });

    const briefEnvelope = await withRetry(
      (attempt) =>
        this.contentBriefOutlineAgent.execute(
          { topic },
          { runId, entityId, attempt },
        ),
      3,
    );

    await this.orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "topic_candidate",
      agent: briefEnvelope.agent,
      fromState: "queued",
      toState: "outline_generated",
      details: { briefId: briefEnvelope.output.brief.id },
    });

    const draftEnvelope = await withRetry(
      (attempt) =>
        this.articleDraftingAgent.execute(
          { brief: briefEnvelope.output.brief },
          { runId, entityId, attempt },
        ),
      3,
    );

    await this.orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "draft",
      agent: draftEnvelope.agent,
      fromState: "outline_generated",
      toState: "draft_generated",
      details: { draftId: draftEnvelope.output.draft.id },
    });

    const qaEnvelope = await withRetry(
      (attempt) =>
        this.editorialQaAgent.execute(
          {
            brief: briefEnvelope.output.brief,
            draft: draftEnvelope.output.draft,
          },
          { runId, entityId, attempt },
        ),
      2,
    );

    await this.orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "draft",
      agent: qaEnvelope.agent,
      fromState: "draft_generated",
      toState: "in_review",
      details: this.orchestrator.summarizeDraftPackage({
        brief: briefEnvelope.output.brief,
        qa: qaEnvelope.output,
      }),
    });

    return {
      brief: briefEnvelope.output.brief,
      draft: qaEnvelope.output.normalizedDraft,
      qa: qaEnvelope.output,
    };
  }

  async runPublishPipeline(input: PublishingAgentInput) {
    const runId = `run_publish_${Date.now()}`;
    const entityId = input.draft.id;

    this.orchestrator.requireApproval(input.approved);
    await this.orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "draft",
      agent: "editorial_qa",
      toState: "approved",
      approvedByHuman: true,
    });

    const publishEnvelope = await withRetry(
      (attempt) => this.publishingAgent.execute(input, { runId, entityId, attempt }),
      3,
    );

    await this.orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "publication",
      agent: publishEnvelope.agent,
      fromState: "approved",
      toState: "published",
      approvedByHuman: true,
      details: this.orchestrator.summarizePublish(publishEnvelope.output),
    });

    return publishEnvelope.output;
  }

  async runMonitoring(input: string[] | PerformanceMonitoringInput) {
    const runId = `run_monitor_${Date.now()}`;
    const normalizedInput: PerformanceMonitoringInput = Array.isArray(input)
      ? { urls: input }
      : input;
    const entityId = normalizedInput.urls[0] ?? "publication_batch";

    const envelope = await withRetry(
      (attempt) =>
        this.performanceMonitoringRefreshAgent.execute(normalizedInput, {
          runId,
          entityId,
          attempt,
        }),
      3,
    );

    await this.orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "publication",
      agent: envelope.agent,
      fromState: "published",
      toState: envelope.output.tasks.length > 0 ? "refresh_recommended" : "monitoring",
      details: this.orchestrator.summarizeMonitoring(envelope.output),
    });

    return envelope.output.tasks;
  }
}
