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
    const sections = this.buildFallbackSections(brief);
    const faq = brief.faqCandidates.map((question) => ({
      question,
      answer:
        "Use the review step to finalize this answer with fact-checked product details, careful caveats, and current CookUnity positioning.",
    }));
    const html = this.composeHtml({
      title,
      intro:
        "If you're evaluating prepared meal options, the right choice usually comes down to quality, convenience, variety, and whether the service feels realistic for your week.",
      brief,
      sections,
      faq,
    });

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
        "If you're evaluating prepared meal options, the right choice usually comes down to quality, convenience, variety, and whether the service feels realistic for your week.",
      sections,
      faq,
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
                text: `${promptInput}\n\nReturn JSON with keys: h1, titleTagOptions, metaDescriptionOptions, slugRecommendation, intro, sections, faq, schemaSuggestions, ctaSuggestions, editorNotes, targetKeywords, competitorNotes, revisionChecklist, html. Requirements: at least 6 H2-level sections, each with 2-4 sentences; include a key takeaways section near the top; include a conclusion before FAQ; avoid placeholder copy.`,
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

      const sections = this.ensureStructuredSections(brief, parsed.sections);
      const faq =
        parsed.faq?.filter((item) => item.question && item.answer).map((item) => ({
          question: item.question ?? "",
          answer: item.answer ?? "",
        })) ?? [];
      const intro = parsed.intro ?? brief.intentSummary;
      const h1 = parsed.h1 ?? brief.titleOptions[0] ?? brief.primaryKeyword;

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
        h1,
        intro,
        sections,
        faq,
        schemaSuggestions: parsed.schemaSuggestions?.length ? parsed.schemaSuggestions : ["Article", "FAQPage"],
        ctaSuggestions: parsed.ctaSuggestions?.length ? parsed.ctaSuggestions : brief.ctaRecommendations,
        editorNotes: parsed.editorNotes?.length ? parsed.editorNotes : ["Generated via OpenAI drafting flow."],
        targetKeywords: parsed.targetKeywords?.length ? parsed.targetKeywords : [brief.primaryKeyword, ...brief.secondaryKeywords],
        competitorNotes: parsed.competitorNotes?.length ? parsed.competitorNotes : brief.differentiators,
        revisionChecklist:
          parsed.revisionChecklist?.length
            ? parsed.revisionChecklist
            : ["Fact-check claims", "Review tone against CookUnity brand voice", "Confirm internal links"],
        html: parsed.html?.includes("<h2>") ? parsed.html : this.composeHtml({ title: h1, intro, brief, sections, faq }),
        createdAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private buildFallbackSections(brief: ContentBrief): Draft["sections"] {
    return [
      {
        heading: "Key takeaways",
        level: 2,
        body: `Readers comparing ${brief.primaryKeyword} usually want clarity on quality, convenience, variety, and whether the service fits real-life routines. This article should help them compare options without overclaiming and understand where CookUnity stands out.`,
      },
      {
        heading: `What to know before choosing ${brief.primaryKeyword}`,
        level: 2,
        body:
          "Start with the fundamentals: ingredient quality, freshness, menu variety, dietary fit, and whether ordering actually reduces friction on busy days. The best article should frame these as buying criteria, not generic lifestyle claims.",
      },
      {
        heading: `How ${brief.primaryKeyword} options differ in practice`,
        level: 2,
        body:
          "Many services look similar at the category level but differ in chef quality, portion style, flavor range, flexibility, and packaging experience. Give readers a concrete way to compare what they would actually receive week to week.",
      },
      {
        heading: "What to compare before you order",
        level: 2,
        body:
          "Encourage readers to compare menu rotation, dietary filters, delivery cadence, storage window, and the balance between convenience and meal quality. This section should translate search intent into a practical shortlist of decision criteria.",
      },
      {
        heading: "How CookUnity fits the decision set",
        level: 2,
        body:
          "Position CookUnity as a chef-crafted prepared meal option with menu variety and stronger food discovery than generic subscription language suggests. Keep the comparison grounded in product experience and avoid unsupported superiority claims.",
      },
      {
        heading: "Common tradeoffs and mistakes to avoid",
        level: 2,
        body:
          "Readers should understand the tradeoffs between convenience, price sensitivity, variety, and nutritional preferences. Call out common mistakes like focusing on a single marketing claim while ignoring taste, freshness, or weeknight usability.",
      },
      {
        heading: "Bottom line",
        level: 2,
        body:
          "Close with a decision-oriented summary that helps the reader move forward. The conclusion should reinforce what matters most in the category and make the CookUnity CTA feel relevant rather than forced.",
      },
    ];
  }

  private ensureStructuredSections(
    brief: ContentBrief,
    parsedSections: Array<{ heading?: string; level?: number; body?: string }> | undefined,
  ): Draft["sections"] {
    const cleaned =
      parsedSections?.filter((section) => section.heading && section.body).map((section) => ({
        heading: section.heading ?? "",
        level: section.level ?? 2,
        body: section.body ?? "",
      })) ?? [];

    if (cleaned.length >= 6) {
      return cleaned;
    }

    const fallback = this.buildFallbackSections(brief);
    const byHeading = new Set(cleaned.map((section) => section.heading.toLowerCase()));

    for (const section of fallback) {
      if (cleaned.length >= 6) {
        break;
      }
      if (!byHeading.has(section.heading.toLowerCase())) {
        cleaned.push(section);
        byHeading.add(section.heading.toLowerCase());
      }
    }

    return cleaned;
  }

  private composeHtml(args: {
    title: string;
    intro: string;
    brief: ContentBrief;
    sections: Draft["sections"];
    faq: Draft["faq"];
  }): string {
    const titleTag = args.title;
    const metaDescription =
      `Compare options, quality signals, and what to look for in ${args.brief.primaryKeyword} before you choose a service.`.slice(0, 155);

    return [
      "<article>",
      `<h1>${this.escapeHtml(args.title)}</h1>`,
      `<p>${this.escapeHtml(args.intro)}</p>`,
      ...args.sections.map((section) => {
        const tag = section.level >= 3 ? "h3" : "h2";
        return `<${tag}>${this.escapeHtml(section.heading)}</${tag}><p>${this.escapeHtml(section.body)}</p>`;
      }),
      "<h2>Frequently Asked Questions</h2>",
      ...args.faq.map(
        (item) =>
          `<h3>${this.escapeHtml(item.question)}</h3><p>${this.escapeHtml(item.answer)}</p>`,
      ),
      `<p><strong>Suggested title tag:</strong> ${this.escapeHtml(titleTag)}</p>`,
      `<p><strong>Suggested meta description:</strong> ${this.escapeHtml(metaDescription)}</p>`,
      "</article>",
    ].join("");
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}
