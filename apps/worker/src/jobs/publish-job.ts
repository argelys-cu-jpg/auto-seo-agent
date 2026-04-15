import { PublishingService } from "@cookunity-seo-agent/core";
import { mockDraft, log } from "@cookunity-seo-agent/shared";

export async function runPublishJob(): Promise<void> {
  const publishingService = new PublishingService();
  const draft = {
    ...mockDraft,
    html: mockDraft.html,
  };

  const result = await publishingService.publishArticle({
    draft,
    tags: ["meal delivery", "healthy eating"],
    categories: ["Prepared Meals"],
    approved: true,
    excerpt: mockDraft.metaDescriptionOptions[0],
  });

  log("info", "Publish job finished", {
    service: "worker.publish",
    entryId: result.entryId,
    documentId: result.documentId,
  });
}
