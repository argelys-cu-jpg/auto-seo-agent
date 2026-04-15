import { getConfig } from "@cookunity-seo-agent/shared";
import type { StrapiArticlePayload, StrapiContentModelConfig } from "./types";

export function getStrapiContentModelConfig(): StrapiContentModelConfig {
  const config = getConfig();
  const fieldMapping = JSON.parse(config.STRAPI_FIELD_MAPPING_JSON) as StrapiContentModelConfig["fields"];

  return {
    collection: config.STRAPI_COLLECTION,
    documentIdField: config.STRAPI_DOCUMENT_ID_FIELD,
    entryIdField: config.STRAPI_ENTRY_ID_FIELD,
    fields: fieldMapping,
  };
}

export function mapToStrapiData(payload: StrapiArticlePayload): Record<string, unknown> {
  const config = getStrapiContentModelConfig();
  return {
    [config.fields.title]: payload.title,
    [config.fields.slug]: payload.slug,
    [config.fields.excerpt]: payload.excerpt ?? payload.metaDescription,
    [config.fields.body]: payload.body,
    [config.fields.seoTitle]: payload.metaTitle,
    [config.fields.metaDescription]: payload.metaDescription,
    [config.fields.schema]: payload.schemaJson ?? {},
    [config.fields.tags]: payload.tags,
    [config.fields.category]: payload.categories[0] ?? null,
    [config.fields.featuredImage]: payload.featuredImage ?? null,
    [config.fields.publishStatus]: payload.status === "publish" ? new Date().toISOString() : null,
  };
}
