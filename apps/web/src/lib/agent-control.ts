import {
  ArticleDraftingAgent,
  ContentBriefOutlineAgent,
  EditorialQaAgent,
  KeywordDiscoveryAgent,
  PerformanceMonitoringRefreshAgent,
  PublishingAgent,
  TopicPrioritizationAgent,
  WorkflowOrchestrator,
  withRetry,
  InMemoryAuditRepository,
} from "@cookunity-seo-agent/core";
import type {
  AgentExecutionEnvelope,
  AgentName,
  ArticleDraftingInput,
  ArticleDraftingOutput,
  ContentBriefAgentInput,
  ContentBriefAgentOutput,
  EditorialQaInput,
  EditorialQaOutput,
  KeywordDiscoveryInput,
  KeywordDiscoveryOutput,
  PerformanceMonitoringInput,
  PerformanceMonitoringOutput,
  PublishingAgentInput,
  PublishingAgentOutput,
  TopicPrioritizationInput,
  TopicPrioritizationOutput,
} from "@cookunity-seo-agent/shared";

const seedTerms = ["prepared meals", "healthy meal delivery", "chef-crafted meals"];
const existingInventory = [
  {
    id: "pub_meal_delivery_basics",
    title: "What Is Prepared Meal Delivery?",
    primaryKeyword: "prepared meal delivery",
    secondaryKeywords: ["meal delivery explained", "prepared meals"],
  },
];
const monitoredUrls = ["https://www.cookunity.com/blog/healthy-prepared-meal-delivery-guide"];

type AnyEnvelope =
  | AgentExecutionEnvelope<KeywordDiscoveryInput, KeywordDiscoveryOutput>
  | AgentExecutionEnvelope<TopicPrioritizationInput, TopicPrioritizationOutput>
  | AgentExecutionEnvelope<ContentBriefAgentInput, ContentBriefAgentOutput>
  | AgentExecutionEnvelope<ArticleDraftingInput, ArticleDraftingOutput>
  | AgentExecutionEnvelope<EditorialQaInput, EditorialQaOutput>
  | AgentExecutionEnvelope<PublishingAgentInput, PublishingAgentOutput>
  | AgentExecutionEnvelope<PerformanceMonitoringInput, PerformanceMonitoringOutput>;

export async function rerunAgent(agentName: AgentName, options?: { approved?: boolean }) {
  const runId = `agent_rerun_${agentName}_${Date.now()}`;
  const auditRepository = new InMemoryAuditRepository();
  const orchestrator = new WorkflowOrchestrator(auditRepository);

  const keywordDiscoveryAgent = new KeywordDiscoveryAgent();
  const topicPrioritizationAgent = new TopicPrioritizationAgent();
  const contentBriefOutlineAgent = new ContentBriefOutlineAgent();
  const articleDraftingAgent = new ArticleDraftingAgent();
  const editorialQaAgent = new EditorialQaAgent();
  const publishingAgent = new PublishingAgent();
  const performanceMonitoringRefreshAgent = new PerformanceMonitoringRefreshAgent();

  async function runDiscoveryStep() {
    const entityId = "discovery_batch";
    const envelope = await withRetry(
      (attempt) =>
        keywordDiscoveryAgent.execute(
          {
            seedTerms,
            existingInventory,
          },
          { runId, entityId, attempt },
        ),
      3,
    );
    await orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "keyword_batch",
      agent: envelope.agent,
      toState: "discovered",
      details: { candidateCount: envelope.output.candidates.length, rerun: true },
    });
    return envelope;
  }

  async function runPrioritizationStep() {
    const discovery = await runDiscoveryStep();
    const entityId = "discovery_batch";
    const envelope = await withRetry(
      (attempt) =>
        topicPrioritizationAgent.execute(
          {
            candidates: discovery.output.candidates,
            existingInventory,
          },
          { runId, entityId, attempt },
        ),
      3,
    );
    await orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "keyword_batch",
      agent: envelope.agent,
      fromState: "discovered",
      toState: "scored",
      details: { rankedCount: envelope.output.rankedTopics.length, rerun: true },
    });
    return { discovery, prioritization: envelope };
  }

  async function runBriefStep() {
    const { discovery, prioritization } = await runPrioritizationStep();
    const topic = orchestrator.selectPrimaryTopic(prioritization.output.rankedTopics);
    const entityId = topic.keyword;

    await orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "topic_candidate",
      agent: "topic_prioritization",
      toState: "queued",
      details: { recommendation: topic.recommendation, rerun: true },
    });

    const envelope = await withRetry(
      (attempt) =>
        contentBriefOutlineAgent.execute(
          { topic },
          { runId, entityId, attempt },
        ),
      3,
    );
    await orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "topic_candidate",
      agent: envelope.agent,
      fromState: "queued",
      toState: "outline_generated",
      details: { briefId: envelope.output.brief.id, rerun: true },
    });
    return { discovery, prioritization, brief: envelope, topic };
  }

  async function runDraftStep() {
    const upstream = await runBriefStep();
    const entityId = upstream.topic.keyword;
    const envelope = await withRetry(
      (attempt) =>
        articleDraftingAgent.execute(
          { brief: upstream.brief.output.brief },
          { runId, entityId, attempt },
        ),
      3,
    );
    await orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "draft",
      agent: envelope.agent,
      fromState: "outline_generated",
      toState: "draft_generated",
      details: { draftId: envelope.output.draft.id, rerun: true },
    });
    return { ...upstream, draft: envelope };
  }

  async function runQaStep() {
    const upstream = await runDraftStep();
    const entityId = upstream.topic.keyword;
    const envelope = await withRetry(
      (attempt) =>
        editorialQaAgent.execute(
          {
            brief: upstream.brief.output.brief,
            draft: upstream.draft.output.draft,
          },
          { runId, entityId, attempt },
        ),
      2,
    );
    await orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "draft",
      agent: envelope.agent,
      fromState: "draft_generated",
      toState: "in_review",
      details: {
        ...orchestrator.summarizeDraftPackage({
          brief: upstream.brief.output.brief,
          qa: envelope.output,
        }),
        rerun: true,
      },
    });
    return { ...upstream, qa: envelope };
  }

  let selectedEnvelope: AnyEnvelope;

  if (agentName === "keyword_discovery") {
    selectedEnvelope = await runDiscoveryStep();
  } else if (agentName === "topic_prioritization") {
    selectedEnvelope = (await runPrioritizationStep()).prioritization;
  } else if (agentName === "content_brief_outline") {
    selectedEnvelope = (await runBriefStep()).brief;
  } else if (agentName === "article_drafting") {
    selectedEnvelope = (await runDraftStep()).draft;
  } else if (agentName === "editorial_qa") {
    selectedEnvelope = (await runQaStep()).qa;
  } else if (agentName === "publishing_strapi") {
    const upstream = await runQaStep();
    const entityId = upstream.draft.output.draft.id;
    const approved = options?.approved === true;

    orchestrator.requireApproval(approved);
    await orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "draft",
      agent: "editorial_qa",
      toState: "approved",
      approvedByHuman: true,
      details: { rerun: true },
    });

    const publishEnvelope = await withRetry(
      (attempt) =>
        publishingAgent.execute(
          {
            draft: upstream.qa.output.normalizedDraft,
            approved,
            tags: ["meal delivery", "healthy eating"],
            categories: ["Prepared Meals"],
            excerpt: upstream.qa.output.normalizedDraft.metaDescriptionOptions[0],
          },
          { runId, entityId, attempt },
        ),
      3,
    );
    selectedEnvelope = publishEnvelope;

    await orchestrator.recordTransition({
      runId,
      entityId,
      entityType: "publication",
      agent: publishEnvelope.agent,
      fromState: "approved",
      toState: "published",
      approvedByHuman: true,
      details: {
        ...orchestrator.summarizePublish(publishEnvelope.output),
        rerun: true,
      },
    });
  } else {
    const monitoringEnvelope = await withRetry(
      (attempt) =>
        performanceMonitoringRefreshAgent.execute(
          { urls: monitoredUrls },
          { runId, entityId: monitoredUrls[0]!, attempt },
        ),
      3,
    );
    selectedEnvelope = monitoringEnvelope;
    await orchestrator.recordTransition({
      runId,
      entityId: monitoredUrls[0]!,
      entityType: "publication",
      agent: monitoringEnvelope.agent,
      fromState: "published",
      toState:
        monitoringEnvelope.output.tasks.length > 0 ? "refresh_recommended" : "monitoring",
      details: {
        ...orchestrator.summarizeMonitoring(monitoringEnvelope.output),
        rerun: true,
      },
    });
  }

  return {
    runId,
    agentName,
    selectedEnvelope,
    auditEvents: auditRepository.all(),
  };
}
