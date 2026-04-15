import type { ContentBriefAgentInput, ContentBriefAgentOutput } from "@cookunity-seo-agent/shared";
import { BaseWorkflowAgent, type AgentContext } from "./base-agent";
import { OutlineGenerationService } from "../services/outline-generation-service";

export class ContentBriefOutlineAgent extends BaseWorkflowAgent<
  ContentBriefAgentInput,
  ContentBriefAgentOutput
> {
  readonly name = "content_brief_outline" as const;
  private readonly service = new OutlineGenerationService();

  constructor() {
    super("outline_generation:v1");
  }

  protected async run(
    input: ContentBriefAgentInput,
    _context: AgentContext,
  ): Promise<ContentBriefAgentOutput> {
    const brief = this.service.generate({
      id: input.topic.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      keyword: input.topic.keyword,
      recommendation: input.topic.recommendation,
    });
    return { brief };
  }
}
