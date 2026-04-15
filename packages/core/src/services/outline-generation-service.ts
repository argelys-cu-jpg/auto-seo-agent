import { loadBrandVoice, promptTemplates } from "@cookunity-seo-agent/prompts";
import type { ContentBrief } from "@cookunity-seo-agent/shared";

export class OutlineGenerationService {
  generate(topic: { id: string; keyword: string; recommendation: string }): ContentBrief {
    const brandVoice = loadBrandVoice();
    const prompt = promptTemplates.outlineGeneration;
    if (!prompt) {
      throw new Error("Missing outline generation prompt template.");
    }

    return {
      id: `brief_${topic.id}`,
      topicId: topic.id,
      primaryKeyword: topic.keyword,
      secondaryKeywords: [
        `${topic.keyword} service`,
        `best ${topic.keyword}`,
        `${topic.keyword} guide`,
      ],
      titleOptions: [
        `${this.titleCase(topic.keyword)}: What to Know Before You Order`,
        `How to Choose ${this.titleCase(topic.keyword)}`,
        `${this.titleCase(topic.keyword)} Guide for Busy Weeknights`,
      ],
      intentSummary:
        "Searchers want practical guidance, comparisons, and signals of quality before choosing a prepared-meal option.",
      differentiators: [
        "Chef-driven quality",
        "Prepared meal convenience",
        "Cuisine and dietary variety",
      ],
      recommendedInternalLinks: [
        {
          targetId: "pub_meal_delivery_basics",
          targetUrl: "/blog/what-is-prepared-meal-delivery",
          anchorText: "prepared meal delivery",
          rationale: "Strengthens the meal-delivery cluster.",
        },
      ],
      faqCandidates: [
        `Is ${topic.keyword} worth it?`,
        `How does ${topic.keyword} compare with meal kits?`,
        `What should you look for in ${topic.keyword}?`,
      ],
      faqSchemaDraft: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
      },
      requiredSources: [
        "Brand-approved product facts",
        "Current menu experience and dietary filter details",
      ],
      factCheckChecklist: [
        "Validate product and operational claims",
        "Remove unsupported medical claims",
        "Confirm link targets",
      ],
      ctaRecommendations: [
        "Explore CookUnity's weekly menu",
        "Browse meals by dietary preference",
      ],
      briefJson: {
        promptTemplateId: prompt.id,
        promptVersion: prompt.version,
        brandVoicePreview: brandVoice.slice(0, 160),
        recommendation: topic.recommendation,
      },
    };
  }

  private titleCase(value: string): string {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
