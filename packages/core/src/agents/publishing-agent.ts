import type { PublishingAgentInput, PublishingAgentOutput } from "@cookunity-seo-agent/shared";
import { BaseWorkflowAgent, type AgentContext } from "./base-agent";
import { PublishingService } from "../services/publishing-service";

export class PublishingAgent extends BaseWorkflowAgent<
  PublishingAgentInput,
  PublishingAgentOutput
> {
  readonly name = "publishing_strapi" as const;
  private readonly service = new PublishingService();

  constructor() {
    super("publishing_strapi:v1");
  }

  protected async run(
    input: PublishingAgentInput,
    _context: AgentContext,
  ): Promise<PublishingAgentOutput> {
    return this.service.publishArticle({
      draft: input.draft,
      approved: input.approved,
      tags: input.tags,
      categories: input.categories,
      canonicalUrl: input.canonicalUrl,
      excerpt: input.excerpt,
      featuredImage: input.featuredImage,
      existingEntryId: input.existingEntryId,
      existingDocumentId: input.existingDocumentId,
    });
  }
}
