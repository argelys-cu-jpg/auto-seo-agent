import { createProviders } from "@cookunity-seo-agent/integrations";
import type { ContentBrief, Draft } from "@cookunity-seo-agent/shared";

export class ReviewDocumentService {
  private providers = createProviders();

  async createReviewDocument(args: {
    brief: ContentBrief;
    draft: Draft;
    reviewerEmail?: string;
  }): Promise<{
    id: string;
    title: string;
    url: string;
    provider: "google_docs" | "mock";
  }> {
    const markdown = [
      `# ${args.draft.h1}`,
      "",
      args.draft.intro,
      "",
      ...args.draft.sections.flatMap((section) => [
        `${"#".repeat(Math.max(2, Math.min(3, section.level)))} ${section.heading}`,
        "",
        section.body,
        "",
      ]),
      "## FAQ",
      "",
      ...args.draft.faq.flatMap((item) => [
        `### ${item.question}`,
        "",
        item.answer,
        "",
      ]),
    ].join("\n");

    return this.providers.reviewDocuments.createDocument({
      title: `${args.draft.h1} Review Draft`,
      summary: `${args.brief.intentSummary} Primary keyword: ${args.brief.primaryKeyword}.`,
      markdown,
      html: args.draft.html,
      ...(args.reviewerEmail ? { reviewerEmail: args.reviewerEmail } : {}),
      metadata: {
        topicId: args.brief.topicId,
        draftId: args.draft.id,
        primaryKeyword: args.brief.primaryKeyword,
      },
    });
  }
}
