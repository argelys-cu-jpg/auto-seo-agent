import { loadBrandVoice, promptTemplates } from "@cookunity-seo-agent/prompts";
import type { ContentBrief, Draft } from "@cookunity-seo-agent/shared";

export class DraftingService {
  generate(brief: ContentBrief): Draft {
    const prompt = promptTemplates.articleDraft;
    if (!prompt) {
      throw new Error("Missing article draft prompt template.");
    }
    const brandVoice = loadBrandVoice();
    const title = brief.titleOptions[0] ?? brief.primaryKeyword;
    const slug = brief.primaryKeyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const sections = [
      {
        heading: `What ${brief.primaryKeyword} shoppers usually care about`,
        level: 2,
        body:
          "Start with practical buying criteria: convenience, ingredient quality, variety, and dietary fit. Keep the guidance grounded and specific.",
      },
      {
        heading: "How CookUnity can fit that need",
        level: 2,
        body:
          "Frame CookUnity as a chef-crafted prepared meal option with menu variety and real food appeal, not as a generic one-size-fits-all subscription.",
      },
      {
        heading: "Questions to ask before choosing a service",
        level: 2,
        body:
          "Encourage readers to compare freshness, menu rotation, dietary flexibility, flavor quality, and weeknight convenience.",
      },
    ];

    const html = [
      "<article>",
      `<p>${brief.intentSummary}</p>`,
      ...sections.map((section) => `<h2>${section.heading}</h2><p>${section.body}</p>`),
      "<h2>FAQ</h2>",
      ...brief.faqCandidates.map((question) => `<h3>${question}</h3><p>Answer pending human fact-check and final polish.</p>`),
      "</article>",
    ].join("");

    return {
      id: `draft_${brief.topicId}`,
      topicId: brief.topicId,
      briefId: brief.id,
      promptVersionId: `${prompt.id}:${prompt.version}`,
      titleTagOptions: brief.titleOptions.map((option) => `${option} | CookUnity`.slice(0, 60)),
      metaDescriptionOptions: [
        `Compare options, quality signals, and what to look for in ${brief.primaryKeyword} before you choose a service.`.slice(0, 155),
      ],
      slugRecommendation: slug,
      h1: title,
      intro:
        "If you're evaluating prepared meal options, the right choice usually comes down to quality, convenience, and whether the menu feels realistic for your week.",
      sections,
      faq: brief.faqCandidates.map((question) => ({
        question,
        answer:
          "This draft answer should be finalized during review with fact-checked product details and careful tone control.",
      })),
      schemaSuggestions: ["Article", "FAQPage"],
      ctaSuggestions: brief.ctaRecommendations,
      editorNotes: [
        "Review all factual references before publish.",
        "Ensure CTAs match current lifecycle messaging.",
        `Brand voice loaded from cookunity_voice.md (${brandVoice.length} chars).`,
      ],
      targetKeywords: [brief.primaryKeyword, ...brief.secondaryKeywords],
      competitorNotes: brief.differentiators,
      revisionChecklist: [
        "Confirm title tag length",
        "Confirm FAQ is non-duplicative",
        "Check internal links against published inventory",
      ],
      html,
      createdAt: new Date().toISOString(),
    };
  }
}
