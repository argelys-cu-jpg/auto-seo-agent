import { createProviders } from "@cookunity-seo-agent/integrations";
import { getConfig } from "@cookunity-seo-agent/shared";
import type { Draft } from "@cookunity-seo-agent/shared";

export interface PublishInput {
  draft: Draft;
  tags: string[];
  categories: string[];
  canonicalUrl?: string;
  excerpt?: string;
  featuredImage?: string;
  approved: boolean;
  existingEntryId?: string;
  existingDocumentId?: string;
}

export class PublishingService {
  private providers = createProviders();

  private buildStrapiPayload(input: PublishInput, status: "draft" | "publish") {
    const excerpt = input.excerpt ?? input.draft.metaDescriptionOptions[0];

    return {
      title: input.draft.h1,
      slug: input.draft.slugRecommendation,
      ...(excerpt ? { excerpt } : {}),
      body: input.draft.html,
      metaTitle: input.draft.titleTagOptions[0] ?? input.draft.h1,
      metaDescription: input.draft.metaDescriptionOptions[0] ?? "",
      tags: input.tags,
      categories: input.categories,
      ...(input.canonicalUrl ? { canonicalUrl: input.canonicalUrl } : {}),
      ...(input.featuredImage ? { featuredImage: input.featuredImage } : {}),
      schemaJson: {
        types: input.draft.schemaSuggestions,
      },
      status,
    };
  }

  validateRequiredFieldsBeforePublish(draft: Draft): string[] {
    const issues: string[] = [];
    if (!draft.titleTagOptions.length) issues.push("Missing title tag options.");
    if (!draft.metaDescriptionOptions.length) issues.push("Missing meta description options.");
    if (!draft.slugRecommendation) issues.push("Missing slug.");
    if (!draft.html) issues.push("Missing article HTML.");
    return issues;
  }

  async publishArticle(input: PublishInput): Promise<{ entryId: string; documentId?: string; previewUrl?: string; fieldMapping: unknown }> {
    if (!input.approved) {
      throw new Error("Manual approval is required before publishing.");
    }

    const config = getConfig();
    const fieldMapping = this.providers.strapi.getContentModelConfig();
    if (!config.PUBLISH_ENABLED) {
      const created = await this.providers.strapi.createDraft(this.buildStrapiPayload(input, "draft"));
      return { ...created, fieldMapping };
    }

    const payload = this.buildStrapiPayload(input, "publish");

    if (input.existingEntryId) {
      await this.providers.strapi.updateArticle(input.existingEntryId, payload, input.existingDocumentId);
      await this.providers.strapi.publishArticle(input.existingEntryId, input.existingDocumentId);
      return {
        entryId: input.existingEntryId,
        ...(input.existingDocumentId ? { documentId: input.existingDocumentId } : {}),
        fieldMapping,
      };
    }

    const created = await this.providers.strapi.createDraft(payload);
    await this.providers.strapi.publishArticle(created.entryId, created.documentId);
    return { ...created, fieldMapping };
  }

  async updateArticle(entryId: string, input: PublishInput): Promise<void> {
    await this.providers.strapi.updateArticle(
      entryId,
      this.buildStrapiPayload(input, "draft"),
      input.existingDocumentId,
    );
  }

  async unpublishArticle(entryId: string, documentId?: string): Promise<void> {
    await this.providers.strapi.unpublishArticle(entryId, documentId);
  }

  async syncStrapiStatus(entryId: string, documentId?: string): Promise<{ status: string; publishedAt?: string; documentId?: string }> {
    return this.providers.strapi.getArticleStatus(entryId, documentId);
  }
}
