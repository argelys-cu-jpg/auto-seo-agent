import { getConfig } from "@cookunity-seo-agent/shared";
import { loadBrandVoice, promptTemplates } from "@cookunity-seo-agent/prompts";
import type { ContentBrief, Draft } from "@cookunity-seo-agent/shared";

export class DraftingService {
  async generate(brief: ContentBrief): Promise<Draft> {
    const prompt = promptTemplates.articleDraft;
    if (!prompt) {
      throw new Error("Missing article draft prompt template.");
    }
    const brandVoice = loadBrandVoice();
    const llmDraft = await this.generateWithOpenAi(brief, brandVoice, prompt.userTemplate);
    if (llmDraft) {
      return llmDraft;
    }
    return this.generateFallback(brief, brandVoice, prompt.id, prompt.version);
  }

  private generateFallback(
    brief: ContentBrief,
    brandVoice: string,
    promptId: string,
    promptVersion: string,
  ): Draft {
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
      promptVersionId: `${promptId}:${promptVersion}`,
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
        "Fallback drafting template used because a live LLM result was unavailable.",
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

  private async generateWithOpenAi(
    brief: ContentBrief,
    brandVoice: string,
    promptTemplate: string,
  ): Promise<Draft | null> {
    const config = getConfig();
    if (!config.OPENAI_API_KEY) {
      return null;
    }

    const promptInput = promptTemplate
      .replace("{{input}}", JSON.stringify(brief, null, 2))
      .replace("{{brandVoice}}", brandVoice);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.OPENAI_MODEL,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Return strict JSON only. No markdown fences. No commentary.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${promptInput}\n\nReturn JSON with keys: h1, titleTagOptions, metaDescriptionOptions, slugRecommendation, intro, sections, faq, schemaSuggestions, ctaSuggestions, editorNotes, targetKeywords, competitorNotes, revisionChecklist, html.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { output_text?: string };
    if (!payload.output_text) {
      return null;
    }

    try {
      const parsed = JSON.parse(payload.output_text) as {
        h1?: string;
        titleTagOptions?: string[];
        metaDescriptionOptions?: string[];
        slugRecommendation?: string;
        intro?: string;
        sections?: Array<{ heading?: string; level?: number; body?: string }>;
        faq?: Array<{ question?: string; answer?: string }>;
        schemaSuggestions?: string[];
        ctaSuggestions?: string[];
        editorNotes?: string[];
        targetKeywords?: string[];
        competitorNotes?: string[];
        revisionChecklist?: string[];
        html?: string;
      };

      return {
        id: `draft_${brief.topicId}`,
        topicId: brief.topicId,
        briefId: brief.id,
        promptVersionId: "article_draft:openai",
        titleTagOptions: parsed.titleTagOptions?.length ? parsed.titleTagOptions : brief.titleOptions,
        metaDescriptionOptions:
          parsed.metaDescriptionOptions?.length
            ? parsed.metaDescriptionOptions
            : [`Explore ${brief.primaryKeyword} with chef-driven perspective from CookUnity.`.slice(0, 155)],
        slugRecommendation:
          parsed.slugRecommendation ??
          brief.primaryKeyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        h1: parsed.h1 ?? brief.titleOptions[0] ?? brief.primaryKeyword,
        intro: parsed.intro ?? brief.intentSummary,
        sections:
          parsed.sections?.filter((section) => section.heading && section.body).map((section) => ({
            heading: section.heading ?? "",
            level: section.level ?? 2,
            body: section.body ?? "",
          })) ?? [],
        faq:
          parsed.faq?.filter((item) => item.question && item.answer).map((item) => ({
            question: item.question ?? "",
            answer: item.answer ?? "",
          })) ?? [],
        schemaSuggestions: parsed.schemaSuggestions?.length ? parsed.schemaSuggestions : ["Article", "FAQPage"],
        ctaSuggestions: parsed.ctaSuggestions?.length ? parsed.ctaSuggestions : brief.ctaRecommendations,
        editorNotes: parsed.editorNotes?.length ? parsed.editorNotes : ["Generated via OpenAI drafting flow."],
        targetKeywords: parsed.targetKeywords?.length ? parsed.targetKeywords : [brief.primaryKeyword, ...brief.secondaryKeywords],
        competitorNotes: parsed.competitorNotes?.length ? parsed.competitorNotes : brief.differentiators,
        revisionChecklist:
          parsed.revisionChecklist?.length
            ? parsed.revisionChecklist
            : ["Fact-check claims", "Review tone against CookUnity brand voice", "Confirm internal links"],
        html: parsed.html ?? "<article></article>",
        createdAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
