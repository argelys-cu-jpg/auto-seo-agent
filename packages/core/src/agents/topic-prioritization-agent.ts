import type { TopicPrioritizationInput, TopicPrioritizationOutput } from "@cookunity-seo-agent/shared";
import { BaseWorkflowAgent, type AgentContext } from "./base-agent";
import { TopicPrioritizationService } from "../services/topic-prioritization-service";

export class TopicPrioritizationAgent extends BaseWorkflowAgent<
  TopicPrioritizationInput,
  TopicPrioritizationOutput
> {
  readonly name = "topic_prioritization" as const;
  private readonly service = new TopicPrioritizationService();

  constructor() {
    super("topic_scoring:v1");
  }

  protected async run(
    input: TopicPrioritizationInput,
    _context: AgentContext,
  ): Promise<TopicPrioritizationOutput> {
    const rankedTopics = this.service.prioritize(
      input.candidates.map((item) => ({
        keyword: item.keyword,
        searchVolume: item.searchVolume,
        keywordDifficulty: item.keywordDifficulty,
        trendVelocity: item.trendVelocity,
        businessRelevance: item.keyword.includes("meal") ? 94 : 75,
        conversionIntent: item.intent.includes("commercial") || item.intent.includes("comparison") ? 88 : 63,
        competitorGap: item.source === "serp" ? 72 : 64,
        freshnessOpportunity: item.source === "gsc" ? 81 : 46,
        clusterValue: item.keyword.split(" ").length >= 3 ? 80 : 62,
        authorityFit: item.keyword.includes("prepared") ? 91 : 77,
      })),
      input.existingInventory,
    );

    return { rankedTopics };
  }
}
