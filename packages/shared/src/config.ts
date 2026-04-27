import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_MODE: z.enum(["mock", "live"]).default("mock"),
  ADMIN_EMAIL: z.string().email().default("reviewer@cookunity.local"),
  ADMIN_PASSWORD: z.string().min(6).default("change-me"),
  NEXT_PUBLIC_APP_NAME: z.string().default("CookUnity SEO Agent"),
  NEXT_PUBLIC_BASE_URL: z.string().url().default("http://127.0.0.1:3001"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/cookunity_seo_agent"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1"),
  AHREFS_API_KEY: z.string().optional(),
  AHREFS_BASE_URL: z.string().url().default("https://api.ahrefs.com"),
  AHREFS_COUNTRY: z.string().default("us"),
  GSC_CLIENT_EMAIL: z.string().optional(),
  GSC_PRIVATE_KEY: z.string().optional(),
  GSC_SITE_URL: z.string().default("https://www.cookunity.com"),
  GA4_PROPERTY_ID: z.string().optional(),
  GOOGLE_TRENDS_GEO: z.string().default("US"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  GOOGLE_DRIVE_REVIEW_FOLDER_ID: z.string().optional(),
  GOOGLE_DOCS_REVIEW_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  SERP_API_KEY: z.string().optional(),
  SERP_PROVIDER: z.string().default("mock"),
  SEMRUSH_API_KEY: z.string().optional(),
  SEMRUSH_BASE_URL: z.string().url().default("https://api.semrush.com"),
  STRAPI_BASE_URL: z.string().url().default("https://cms.example.com"),
  STRAPI_API_TOKEN: z.string().optional(),
  STRAPI_COLLECTION: z.string().default("blog-posts"),
  STRAPI_DOCUMENT_ID_FIELD: z.string().default("documentId"),
  STRAPI_ENTRY_ID_FIELD: z.string().default("id"),
  STRAPI_FIELD_MAPPING_JSON: z
    .string()
    .default(
      '{"title":"title","slug":"slug","excerpt":"excerpt","body":"body","seoTitle":"seo_title","metaDescription":"meta_description","schema":"schema_json","tags":"tags","category":"category","featuredImage":"featured_image","publishStatus":"publishedAt"}',
    ),
  ANALYTICS_PROVIDER: z.string().default("mock"),
  ANALYTICS_API_KEY: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  SLACK_ALERT_WEBHOOK: z.string().optional(),
  PUBLISH_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  ENABLE_MOCK_DATA: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  DISCOVERY_CRON: z.string().default("*/30 * * * *"),
  MONITORING_CRON: z.string().default("0 7 * * *"),
  REFRESH_CRON: z.string().default("0 9 * * 1"),
});

export type AppConfig = z.infer<typeof envSchema>;

let cachedConfig: AppConfig | null = null;

export function getConfig(overrides?: Partial<NodeJS.ProcessEnv>): AppConfig {
  if (!cachedConfig || overrides) {
    cachedConfig = envSchema.parse({
      ...process.env,
      ...overrides,
    });
  }

  return cachedConfig;
}
