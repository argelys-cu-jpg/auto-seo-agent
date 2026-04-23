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
    const normalizedKeyword = brief.primaryKeyword.toLowerCase();
    if (normalizedKeyword.includes("athlete") && normalizedKeyword.includes("meal plan")) {
      return this.buildAthleteMealPlanSections(brief);
    }

    const secondaryA = brief.secondaryKeywords[0] ?? `${brief.primaryKeyword} guide`;
    const secondaryB = brief.secondaryKeywords[1] ?? `best ${brief.primaryKeyword}`;
    const secondaryC = brief.secondaryKeywords[2] ?? `${brief.primaryKeyword} ideas`;
    return [
      {
        heading: "Key takeaways",
        level: 2,
        body: [
          `Readers searching for ${brief.primaryKeyword} usually want a clear answer they can use this week. The article should help them compare quality, convenience, and flavor in plain language, then support the main topic with adjacent demand like ${secondaryA} and ${secondaryB} so the page feels complete instead of thin.`,
          `The strongest version of this piece should answer the main question early, then build confidence with concrete detail. That means showing what matters in real life, what tradeoffs deserve attention, and where CookUnity fits without drifting into vague category language.`,
          `A useful draft should also create enough depth to satisfy search intent on the first visit. Supporting angles like ${secondaryC} should be woven into the article where they strengthen the answer, not treated like detached keyword targets.`,
        ].join("\n\n"),
      },
      {
        heading: `What to know before choosing ${brief.primaryKeyword}`,
        level: 2,
        body: [
          `Start with the practical questions: does the food taste good enough to crave again, does it hold up on a hectic Wednesday, and does the menu leave room for appetite, variety, and dietary preferences. The strongest draft should treat those as real decision criteria, not lifestyle wallpaper, and should use terms like ${secondaryC} where they help sharpen the answer.`,
          `That framing matters because people rarely search this topic in the abstract. They are trying to make a real decision about convenience, quality, and repeatability, often in the middle of an already overloaded week.`,
          `A complete article should help them evaluate the category through that lens. It should move from broad category understanding into a clearer decision framework instead of circling the topic with generic advice.`,
        ].join("\n\n"),
      },
      {
        heading: `How ${brief.primaryKeyword} options differ in practice`,
        level: 2,
        body: [
          `Many services blur together at the category level, but the lived experience is different: chef quality, flavor range, portion feel, flexibility, and whether the meals still feel appealing after the first week. Give readers a concrete way to picture what shows up at the door and what ends up on the plate, and use ${secondaryA} or ${secondaryB} where those subtopics naturally expand the comparison.`,
          `This is the section where the article should get specific. Explain what a stronger option actually feels like across several meals, not just on a single “hero” dinner. Readers are trying to predict consistency, not just first impressions.`,
          `That specificity is also what separates a rich search result from a thin one. A competitive page needs enough detail that the reader can compare providers, expectations, and use cases without bouncing back to the SERP for basic context.`,
        ].join("\n\n"),
      },
      {
        heading: "What to compare before you order",
        level: 2,
        body: [
          `Encourage readers to compare menu rotation, dietary filters, delivery cadence, storage window, and the tradeoff between convenience and pleasure. The article should make room for taste and texture, not just logistics, because nobody sticks with a meal routine that feels dull. This is also where the article can pick up supporting intent around ${secondaryC} without losing the main thread.`,
          `The draft should be explicit about what deserves more weight. Variety matters because repetition kills adherence. Flexibility matters because routines change from week to week. Quality matters because convenience only sticks when the meals still feel worth eating.`,
          `This is also a natural place to support adjacent keyword demand. If users are also looking for ${secondaryA} or ${secondaryB}, the article should answer those angles with real criteria rather than turning them into awkward subheadings with no substance.`,
        ].join("\n\n"),
      },
      {
        heading: "How CookUnity fits the decision set",
        level: 2,
        body: [
          "Position CookUnity as a chef-led prepared meal option with more personality, more culinary point of view, and a stronger sense of menu discovery than generic subscription language suggests. Keep the comparison grounded in product experience and avoid sweeping claims you cannot support.",
          "The draft should make the product fit feel obvious. That means connecting the service to weeknight relief, better meal variety, and the sense that prepared food does not need to feel generic or joyless.",
          "The tone here matters. It should feel premium and assured, but still practical. Readers should understand why CookUnity is different without being hit with generic “healthy and convenient” copy that could apply to any provider in the category.",
        ].join("\n\n"),
      },
      {
        heading: "Common tradeoffs and mistakes to avoid",
        level: 2,
        body: [
          "Readers should understand the tradeoffs between convenience, price sensitivity, variety, and nutritional preferences. Call out common mistakes like obsessing over a single claim while ignoring flavor, freshness, or whether the plan still works on the most chaotic day of the week.",
          "This is where the article can sound especially useful. Point out how easy it is to over-focus on surface-level claims while ignoring the practical reasons a meal routine succeeds or falls apart after two weeks.",
          "A richer draft should help the reader avoid obvious traps: choosing for novelty without consistency, choosing for macro headlines without taste, or choosing for price without considering whether the experience will still feel worthwhile on busy nights.",
        ].join("\n\n"),
      },
      {
        heading: "How to make the choice work week after week",
        level: 2,
        body: [
          `A comprehensive article should not stop at comparison. It should help the reader think about what happens after the first order: how meals fit into the week, how variety supports consistency, and how to keep the plan realistic when work and personal schedules shift.`,
          `That follow-through matters for both rankings and usefulness. Readers are more likely to trust the piece when it anticipates the real-life questions that show up after the initial decision, including how to keep ${brief.primaryKeyword} sustainable instead of aspirational.`,
          `This is also a good place to reinforce supporting demand around ${secondaryA}, ${secondaryB}, or ${secondaryC} if those terms help cover long-tail intent without making the article feel padded.`,
        ].join("\n\n"),
      },
      {
        heading: "Bottom line",
        level: 2,
        body: [
          "Close with a decision-oriented summary that helps the reader move forward. The conclusion should reinforce what matters most in the category and make the CookUnity CTA feel like a natural next move, not a sudden sales pivot.",
          `A strong ending should leave the reader with clarity: what to prioritize, what to ignore, and how to evaluate fit with more confidence than they had at the start. That is what makes the page feel complete instead of merely optimized.`,
          `For CookUnity, the close should bridge useful guidance into a concrete next step. In a blog flow that usually means a softer capture or menu-exploration CTA; in a landing-page flow it should move more directly into trial.`,
        ].join("\n\n"),
      },
    ];
  }

  private buildAthleteMealPlanSections(brief: ContentBrief): Draft["sections"] {
    const secondaryA = brief.secondaryKeywords[0] ?? `${brief.primaryKeyword} guide`;
    const secondaryB = brief.secondaryKeywords[1] ?? `${brief.primaryKeyword} ideas`;
    const secondaryC = brief.secondaryKeywords[2] ?? `best ${brief.primaryKeyword}`;

    return [
      {
        heading: "How athletes should think about a meal plan",
        level: 2,
        body: [
          `A practical meal plan for athletes has to do more than check nutrition boxes. It needs to support training load, protect recovery, and still fit inside a real week of work, commuting, school, travel, and shifting workout times.`,
          `That is why the strongest version of ${brief.primaryKeyword} should be built around repeatable structure rather than perfection. Athletes need enough protein, enough total energy, and enough carbohydrate support to keep the week from unraveling once sessions get harder or schedules get tighter.`,
          `This framing also helps the article support adjacent demand like ${secondaryA} and ${secondaryB}. People rarely search these ideas in isolation. They are trying to figure out how to make performance nutrition usable in real life.`,
        ].join("\n\n"),
      },
      {
        heading: "Pre-workout and post-workout fueling basics",
        level: 2,
        body: [
          `Pre-workout meals should usually emphasize digestible carbohydrate and leave enough room for comfort. The closer someone is eating to training, the simpler the food usually needs to be. If there is more time, the meal can include more fiber, more protein, and a little more fat without creating the same digestion tradeoff.`,
          `Post-workout meals should focus on recovery. That usually means bringing protein back in quickly and pairing it with carbohydrate so the athlete can recover, replenish, and stabilize appetite for the rest of the day. The exact structure varies, but the principle stays steady: the session should not be treated like a nutritional afterthought.`,
          `A rich article should make these distinctions concrete. Instead of generic “eat carbs before and protein after” advice, it should show how different timing windows change the best meal choice and how ${secondaryC} fits into the broader performance picture.`,
        ].join("\n\n"),
      },
      {
        heading: "What a 7-day meal plan for athletes can look like",
        level: 2,
        body: [
          `The sample structure below is not a universal prescription. It is a realistic example of how an athlete might organize a week with a mix of training days, lighter days, and recovery windows. The point is to show what consistency can look like when meals are built around real schedule demands.`,
          `Across the week, the pattern should stay recognizable: a stable breakfast, a lunch that supports the next block of the day, a smarter pre-workout or post-workout snack when needed, and a dinner that does enough recovery work without creating more friction than the athlete can sustain.`,
        ].join("\n\n"),
      },
      {
        heading: "Day 1: Mid-morning training day",
        level: 2,
        body: [
          `Breakfast can be simple and carbohydrate-forward, like toast or an English muffin with nut butter, fruit, and milk. The goal is enough energy to start the day without making the first session feel heavy.`,
          `After the workout, lunch should do more recovery work. A strong option might include a protein anchor like chicken, tofu, chickpeas, or Greek yogurt, plus a grain or wrap and fruit on the side. Dinner can then stay balanced rather than oversized: a chef-made bowl, grilled protein with starch and vegetables, or another complete meal that keeps the athlete from playing catch-up late at night.`,
          `This day is useful because it shows how ${brief.primaryKeyword} should flex around training timing. The article should highlight how the first post-workout meal carries more nutritional weight than an average lunch on a non-training day.`,
        ].join("\n\n"),
      },
      {
        heading: "Day 2: Afternoon training day",
        level: 2,
        body: [
          `On a later training day, breakfast and lunch need to build the runway. A more substantial breakfast with eggs, oats, potatoes, yogurt, or fruit can work well, while lunch should provide enough carbohydrate and protein that the athlete does not head into the session underfueled.`,
          `A pre-workout snack in the late afternoon might be lighter and easier to digest: toast, crackers, fruit, or a small yogurt-based option depending on the timing window. Dinner becomes the main recovery meal, with enough protein and carbohydrate to support the session without turning the evening into a second round of prep.`,
          `This is a useful place to reinforce supporting demand around ${secondaryA}. A good athlete meal plan is not just a list of foods. It is a timing strategy that keeps the whole day coherent.`,
        ].join("\n\n"),
      },
      {
        heading: "Day 3: Active recovery or lower-intensity day",
        level: 2,
        body: [
          `Lower-intensity days do not need the same carbohydrate emphasis as hard training days, but they still need structure. Breakfast, lunch, and dinner should stay protein-aware and satisfying enough that the athlete does not drift into unplanned under-eating or constant snacking.`,
          `This is often a good day for simpler meals: eggs and toast, leftovers with grains and vegetables, yogurt with fruit, salmon with potatoes, or another balanced dinner that feels restorative instead of overly engineered. The plan should remain supportive without pretending every day requires the same fueling pattern.`,
          `For search intent, this is one of the sections that makes the article more complete. Readers want to know how the plan adjusts, not just how it performs on the hardest day of the week.`,
        ].join("\n\n"),
      },
      {
        heading: "Days 4 through 7: Repeat the pattern without repeating the exact meals",
        level: 2,
        body: [
          `The final four days should show how the structure continues: a harder early session may call for quicker pre-workout carbohydrate, a late game may require dinner to happen earlier, and a full rest day may shift the focus toward simpler balanced meals rather than aggressive fueling.`,
          `The key is not to prescribe seven rigid days of identical eating. The key is to show repeatable logic. Athletes need enough variety to stay engaged, but enough consistency that performance nutrition does not turn into a constant decision-making exercise.`,
          `That is also where prepared meals can be especially useful. If the athlete already has a strong dinner option ready on the nights when training runs long or work spills over, the weekly plan becomes much easier to maintain. That is the CookUnity bridge the article should earn rather than force.`,
        ].join("\n\n"),
      },
      {
        heading: "Where CookUnity fits into an athlete meal plan",
        level: 2,
        body: [
          `CookUnity should not be positioned as a shortcut around performance nutrition. It should be positioned as a way to keep the plan intact when time, energy, or schedule pressure would otherwise push the athlete toward lower-quality convenience food or skipped meals.`,
          `That means emphasizing chef-made quality, meal variety, and the practical value of having recovery-supportive dinners already handled. The strongest copy should connect that convenience to adherence and week-to-week consistency, not just to generic wellness language.`,
          `This section should also help the article support long-tail demand like ${secondaryB}. Readers are often comparing not just foods, but systems: what actually makes it easier to keep eating well across a full training week.`,
        ].join("\n\n"),
      },
      {
        heading: "Bottom line",
        level: 2,
        body: [
          `A strong meal plan for athletes should show how to fuel training days, recovery days, and the messy in-between. It should give the reader a structure they can adapt, not a brittle script they will abandon the moment the week changes.`,
          `When the article is working, the reader finishes with a better sense of timing, balance, and what a sustainable athlete meal plan actually looks like. That makes the CookUnity bridge feel practical: one more way to protect the plan on the days when consistency is hardest to keep.`,
        ].join("\n\n"),
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
    return [
      `If you're evaluating ${brief.primaryKeyword}, the real question is not just what looks good on a landing page. It's what will still taste satisfying, feel convenient on a busy night, and hold up as part of your actual routine.`,
      `A strong article should answer that directly, then use supporting angles like ${support || "comparison criteria and practical examples"} to make the page feel complete. The goal is not to hit a word count for its own sake. The goal is to cover the topic with enough depth that the reader can stop searching and start deciding.`,
    ].join("\n\n");
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
      ...args.intro
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph) => `<p>${this.escapeHtml(paragraph)}</p>`),
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
        const paragraphs = section.body
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((paragraph) => `<p>${this.escapeHtml(paragraph)}</p>`)
          .join("");
        return `<${tag}>${this.escapeHtml(section.heading)}</${tag}>${paragraphs}`;
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
