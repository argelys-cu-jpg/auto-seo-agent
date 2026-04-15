import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface PromptTemplate {
  id: string;
  version: string;
  system: string;
  userTemplate: string;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const brandVoicePath = path.resolve(currentDir, "../brand/cookunity_voice.md");

export function loadBrandVoice(): string {
  return fs.readFileSync(brandVoicePath, "utf8");
}

export const promptTemplates: Record<string, PromptTemplate> = {
  keywordCluster: {
    id: "keyword_cluster",
    version: "v1",
    system: "You cluster SEO keyword opportunities for CookUnity. Use strict semantic grouping and avoid merging distinct search intents.",
    userTemplate:
      "Cluster the following keywords into pillar, support, refresh, FAQ, or skip buckets. Explain cannibalization risks and the preferred content architecture.\n\n{{input}}\n\nBrand voice:\n{{brandVoice}}",
  },
  topicScoring: {
    id: "topic_scoring",
    version: "v1",
    system: "You explain SEO topic prioritization decisions for a chef-driven prepared meal brand.",
    userTemplate:
      "Review this topic candidate and produce a concise scoring rationale with business alignment notes.\n\n{{input}}\n\nBrand voice:\n{{brandVoice}}",
  },
  outlineGeneration: {
    id: "outline_generation",
    version: "v1",
    system: "You create production-ready SEO content briefs and outlines for CookUnity.",
    userTemplate:
      "Generate multiple title options, an H1/H2/H3 outline, intent summary, FAQ set, internal links, CTA ideas, competitor angle, fact-check checklist, and JSON-LD FAQ draft.\n\n{{input}}\n\nBrand voice:\n{{brandVoice}}",
  },
  articleDraft: {
    id: "article_draft",
    version: "v1",
    system: "You draft high-quality SEO articles for CookUnity. No unsupported claims. No keyword stuffing.",
    userTemplate:
      "Draft the article package using the brief below. Include title tags, meta descriptions, slug, H1, intro, body sections, FAQ, CTA guidance, schema suggestions, editor notes, competitor notes, and revision checklist.\n\n{{input}}\n\nBrand voice:\n{{brandVoice}}",
  },
  refreshDraft: {
    id: "refresh_draft",
    version: "v1",
    system: "You refresh existing SEO content based on performance decay or missed opportunities.",
    userTemplate:
      "Revise the article plan with updates to improve CTR, rankings, freshness, or cluster coverage.\n\n{{input}}\n\nBrand voice:\n{{brandVoice}}",
  },
  internalLinking: {
    id: "internal_linking",
    version: "v1",
    system: "You recommend internal links that improve topical authority and user navigation without spammy repetition.",
    userTemplate:
      "Suggest internal links, anchor diversity, and missing supporting content based on this topic graph.\n\n{{input}}\n\nBrand voice:\n{{brandVoice}}",
  },
  faqSchema: {
    id: "faq_schema",
    version: "v1",
    system: "You generate FAQ candidates and schema-safe FAQ JSON-LD for CookUnity content.",
    userTemplate:
      "Generate FAQ pairs and JSON-LD draft for the following article concept.\n\n{{input}}\n\nBrand voice:\n{{brandVoice}}",
  },
};
