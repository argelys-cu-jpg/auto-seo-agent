import type { ArticleDraftingInput, ArticleDraftingOutput } from "@cookunity-seo-agent/shared";
import { BaseWorkflowAgent, type AgentContext } from "./base-agent";
import { DraftingService } from "../services/drafting-service";

export class ArticleDraftingAgent extends BaseWorkflowAgent<
  ArticleDraftingInput,
  ArticleDraftingOutput
> {
  readonly name = "article_drafting" as const;
  private readonly service = new DraftingService();

  constructor() {
    super("article_draft:v1");
  }

  protected async run(
    input: ArticleDraftingInput,
    _context: AgentContext,
  ): Promise<ArticleDraftingOutput> {
    const draft = await this.service.generate(input.brief);
    return { draft };
  }
}
