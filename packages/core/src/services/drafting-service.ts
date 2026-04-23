import { getConfig, type OutlinePackage } from "@cookunity-seo-agent/shared";
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
    const outlinePackage = this.readOutlinePackage(brief);
    const title = outlinePackage?.selectedTitle ?? brief.titleOptions[0] ?? brief.primaryKeyword;
    const slug =
      outlinePackage?.selectedSlug ??
      brief.primaryKeyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const keyTakeaways = this.buildKeyTakeaways(brief, outlinePackage);
    const sections = this.buildFallbackSections(brief);
    const faq = brief.faqCandidates.map((question) => ({
      question,
      answer:
        "The strongest answer should stay practical, grounded, and specific to how people actually eat during the week. Use review to tighten facts, product details, and current CookUnity positioning before publish.",
    }));
    const html = this.composeHtml({
      title,
      intro: this.buildFallbackIntro(brief),
      keyTakeaways,
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
      intro: this.buildFallbackIntro(brief),
      keyTakeaways,
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
      imagePlan: this.buildImagePlan(title, sections),
      publishPackage: this.buildPublishPackage(title, slug, brief, html),
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
      const outlinePackage = this.readOutlinePackage(brief);
      const h1 = parsed.h1 ?? outlinePackage?.selectedTitle ?? brief.titleOptions[0] ?? brief.primaryKeyword;
      const keyTakeaways = this.buildKeyTakeaways(brief, outlinePackage);
      const html = parsed.html?.includes("<h2>")
        ? parsed.html
        : this.composeHtml({ title: h1, intro, keyTakeaways, brief, sections, faq });
      const slugRecommendation =
        parsed.slugRecommendation ??
        outlinePackage?.selectedSlug ??
        brief.primaryKeyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
        slugRecommendation,
        h1,
        intro,
        keyTakeaways,
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
        imagePlan: this.buildImagePlan(h1, sections),
        publishPackage: this.buildPublishPackage(h1, slugRecommendation, brief, html),
        html,
        createdAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private buildFallbackSections(brief: ContentBrief): Draft["sections"] {
    const secondaryA = brief.secondaryKeywords[0] ?? `${brief.primaryKeyword} guide`;
    const secondaryB = brief.secondaryKeywords[1] ?? `best ${brief.primaryKeyword}`;
    const secondaryC = brief.secondaryKeywords[2] ?? `${brief.primaryKeyword} ideas`;
    return [
      {
        heading: "Key takeaways",
        level: 2,
        body: `Readers searching for ${brief.primaryKeyword} usually want a clear answer they can use this week. The article should help them compare quality, convenience, and flavor in plain language, then support the main topic with adjacent demand like ${secondaryA} and ${secondaryB} so the page feels complete instead of thin.`,
      },
      {
        heading: `What to know before choosing ${brief.primaryKeyword}`,
        level: 2,
        body:
          `Start with the practical questions: does the food taste good enough to crave again, does it hold up on a hectic Wednesday, and does the menu leave room for appetite, variety, and dietary preferences. The strongest draft should treat those as real decision criteria, not lifestyle wallpaper, and should use terms like ${secondaryC} where they help sharpen the answer.`,
      },
      {
        heading: `How ${brief.primaryKeyword} options differ in practice`,
        level: 2,
        body:
          `Many services blur together at the category level, but the lived experience is different: chef quality, flavor range, portion feel, flexibility, and whether the meals still feel appealing after the first week. Give readers a concrete way to picture what shows up at the door and what ends up on the plate, and use ${secondaryA} or ${secondaryB} where those subtopics naturally expand the comparison.`,
      },
      {
        heading: "What to compare before you order",
        level: 2,
        body:
          `Encourage readers to compare menu rotation, dietary filters, delivery cadence, storage window, and the tradeoff between convenience and pleasure. The article should make room for taste and texture, not just logistics, because nobody sticks with a meal routine that feels dull. This is also where the article can pick up supporting intent around ${secondaryC} without losing the main thread.`,
      },
      {
        heading: "How CookUnity fits the decision set",
        level: 2,
        body:
          "Position CookUnity as a chef-led prepared meal option with more personality, more culinary point of view, and a stronger sense of menu discovery than generic subscription language suggests. Keep the comparison grounded in product experience and avoid sweeping claims you cannot support.",
      },
      {
        heading: "Common tradeoffs and mistakes to avoid",
        level: 2,
        body:
          "Readers should understand the tradeoffs between convenience, price sensitivity, variety, and nutritional preferences. Call out common mistakes like obsessing over a single claim while ignoring flavor, freshness, or whether the plan still works on the most chaotic day of the week.",
      },
      {
        heading: "Bottom line",
        level: 2,
        body:
          "Close with a decision-oriented summary that helps the reader move forward. The conclusion should reinforce what matters most in the category and make the CookUnity CTA feel like a natural next move, not a sudden sales pivot.",
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

  private buildKeyTakeaways(brief: ContentBrief, outlinePackage: OutlinePackage | null): string[] {
    const seoOpportunity = outlinePackage?.analysis.seoOpportunities[0];
    const internalLink = brief.recommendedInternalLinks[0]?.anchorText;
    const cta = brief.ctaRecommendations[0];
    return [
      `Lead with the reader’s real decision around ${brief.primaryKeyword}, not category filler.`,
      ...(brief.secondaryKeywords[0] ? [`Use ${brief.secondaryKeywords[0]} to reinforce the article where it adds real explanatory value.`] : []),
      seoOpportunity
        ? `${seoOpportunity.charAt(0).toUpperCase()}${seoOpportunity.slice(1)}.`
        : "Keep the article practical, chef-aware, and rooted in real weeknight use.",
      ...(internalLink ? [`Bring in ${internalLink} early enough to support the story, not as an afterthought.`] : []),
      ...(cta ? [`Close with a CTA that feels earned and aligns naturally to “${cta}.”`] : []),
    ].slice(0, 4);
  }

  private buildFallbackIntro(brief: ContentBrief): string {
    const support = brief.secondaryKeywords.slice(0, 2).join(" and ");
    return `If you're evaluating ${brief.primaryKeyword}, the real question is not just what looks good on a landing page. It's what will still taste satisfying, feel convenient on a busy night, and hold up as part of your actual routine. The article should answer that directly, then use supporting angles like ${support || "comparison criteria and practical examples"} to make the page feel complete.`;
  }

  private buildImagePlan(title: string, sections: Draft["sections"]) {
    return {
      headerImageTerm: title.toLowerCase().replace(/[^a-z0-9\s]+/g, "").trim(),
      sectionImages: sections
        .filter((section) => section.level >= 2)
        .map((section) => ({
          header: section.heading,
          searchTerm: section.heading.toLowerCase().replace(/[^a-z0-9\s]+/g, "").trim(),
        })),
    };
  }

  private buildPublishPackage(title: string, slug: string, brief: ContentBrief, html: string) {
    const blocks = [
      {
        __component: "shared.rich-text",
        body: html,
      },
    ];
    return {
      slug,
      description: brief.intentSummary,
      blocks,
      mealCarouselInsertions: 2,
    };
  }

  private composeHtml(args: {
    title: string;
    intro: string;
    keyTakeaways?: string[];
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
      ...(args.keyTakeaways?.length
        ? [
            "<h2>Key takeaways</h2>",
            "<ul>",
            ...args.keyTakeaways.map((item) => `<li>${this.escapeHtml(item)}</li>`),
            "</ul>",
          ]
        : []),
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

  private readOutlinePackage(brief: ContentBrief): OutlinePackage | null {
    if (!brief.briefJson || typeof brief.briefJson !== "object") {
      return null;
    }
    const outlinePackage = (brief.briefJson as Record<string, unknown>).outlinePackage;
    if (!outlinePackage || typeof outlinePackage !== "object") {
      return null;
    }
    return outlinePackage as OutlinePackage;
  }
}
