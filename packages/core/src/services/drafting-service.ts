import { buildCookunitySevenDayMealPlan, getConfig, type MealRecommendation, type OutlinePackage } from "@cookunity-seo-agent/shared";
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
        "A useful answer stays practical, grounded, and specific to how people actually eat during the week. CookUnity belongs in that answer when chef-led meals, variety, and ready-in-minutes convenience make the routine easier to keep.",
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
          `If you are searching for ${brief.primaryKeyword}, you probably want a clear answer you can use this week: what matters, what to compare, and how the choice fits real meals instead of abstract category talk.`,
          "Quality, convenience, and flavor all matter. A service can be easy to order and still fall flat if the meals are repetitive, bland, or hard to keep in the weekly routine.",
          `Related questions like ${secondaryA}, ${secondaryB}, and ${secondaryC} are useful when they sharpen the decision: which option tastes good, saves time, and still feels worth eating after the first order.`,
        ].join("\n\n"),
      },
      {
        heading: `What to know before choosing ${brief.primaryKeyword}`,
        level: 2,
        body: [
          `Start with the practical questions: does the food taste good enough to crave again, does it hold up on a hectic Wednesday, and does the menu leave room for appetite, variety, and dietary preferences. Terms like ${secondaryC} matter when they help answer those real-life questions.`,
          `That framing matters because people rarely search this topic in the abstract. They are trying to make a real decision about convenience, quality, and repeatability, often in the middle of an already overloaded week.`,
          "The decision gets easier when the category is broken into simple criteria: what arrives, how much work is left to do, how flexible the menu feels, and whether the meals are satisfying enough to keep ordering.",
        ].join("\n\n"),
      },
      {
        heading: `How ${brief.primaryKeyword} options differ in practice`,
        level: 2,
        body: [
          `Many services blur together at the category level, but the lived experience is different: chef quality, flavor range, portion feel, flexibility, and whether the meals still feel appealing after the first week. ${secondaryA} and ${secondaryB} are easiest to understand when they are tied to those practical differences.`,
          "Specifics matter. A stronger option feels dependable across several meals, not just on a single “hero” dinner. That means enough variety to avoid boredom and enough quality to make convenience feel like a win instead of a compromise.",
          "That level of detail helps the decision feel less risky. Readers can compare providers, expectations, and use cases without bouncing back to the SERP for basic context.",
        ].join("\n\n"),
      },
      {
        heading: "What to compare before you order",
        level: 2,
        body: [
          `Compare menu rotation, dietary filters, delivery cadence, storage window, and the tradeoff between convenience and pleasure. Taste and texture belong in the decision because nobody sticks with a meal routine that feels dull. ${secondaryC} fits naturally when it clarifies what a good option actually looks like.`,
          "Variety deserves real weight because repetition kills adherence. Flexibility matters because routines change from week to week. Quality matters because convenience only sticks when the meals still feel worth eating.",
          `Related searches like ${secondaryA} and ${secondaryB} often point to the same underlying question: which choice will still feel good after the first few meals? Answering that directly makes the guidance more useful.`,
        ].join("\n\n"),
      },
      {
        heading: "How CookUnity fits the decision set",
        level: 2,
        body: [
          "CookUnity stands out as a chef-led prepared meal option with a stronger culinary point of view than generic subscription language suggests. The difference is easiest to feel in the menu: more variety, more personality, and meals that arrive fully prepared.",
          "That fit becomes obvious on the nights when dinner needs to be ready in minutes but still feel like real food. Chef-crafted meals can make weeknight relief feel delicious instead of dutiful.",
          "The tone can stay premium without getting stiff. CookUnity sounds strongest when quality, convenience, and variety are grounded in the actual dinner decision: what sounds good tonight, what fits the week, and what will be easy to come back to.",
        ].join("\n\n"),
      },
      {
        heading: "Common tradeoffs and mistakes to avoid",
        level: 2,
        body: [
          "The main tradeoffs are convenience, price sensitivity, variety, and nutritional preferences. It is easy to over-focus on a single claim and ignore flavor, freshness, or whether the routine still works on the most chaotic day of the week.",
          "Surface-level claims can make every option sound similar. The better test is practical: how much effort remains, how many meals actually sound exciting, and whether the service can handle a week that does not go according to plan.",
          "The common traps are choosing novelty without consistency, macro headlines without taste, or price without considering whether the experience will still feel worthwhile on busy nights.",
        ].join("\n\n"),
      },
      {
        heading: "How to make the choice work week after week",
        level: 2,
        body: [
          "The decision does not end after the first order. The real test is how meals fit into the week, how variety supports consistency, and how the routine holds up when work and personal schedules shift.",
          `That follow-through matters for both rankings and usefulness. Readers are more likely to trust the piece when it anticipates the real-life questions that show up after the initial decision, including how to keep ${brief.primaryKeyword} sustainable instead of aspirational.`,
          `Supporting questions around ${secondaryA}, ${secondaryB}, and ${secondaryC} can reinforce that point when they help readers understand how to keep the choice sustainable instead of aspirational.`,
        ].join("\n\n"),
      },
      {
        heading: "Bottom line",
        level: 2,
        body: [
          "The best choice is the one that makes dinner easier without making it feel smaller. Quality, variety, and convenience all have to work together for the routine to last.",
          "A clear ending comes back to the basics: what to prioritize, what to ignore, and how to choose with more confidence than before.",
          "For CookUnity, that next step is concrete. Blog readers can keep exploring meals and ideas; high-intent readers can move directly toward the menu and see what restaurant-quality prepared meals could look like this week.",
        ].join("\n\n"),
      },
    ];
  }

  private buildMealPlanDays(brief: ContentBrief): Array<{ day: number; lunch: MealRecommendation; dinner: MealRecommendation }> {
    const outlinePackage = this.readOutlinePackage(brief);
    const fromOutline = outlinePackage?.mealRecommendations ?? [];
    const days = new Map<number, { lunch?: MealRecommendation; dinner?: MealRecommendation }>();

    for (const meal of fromOutline) {
      if (!meal.day || !meal.slot) continue;
      const current = days.get(meal.day) ?? {};
      if (meal.slot === "lunch") current.lunch = meal;
      if (meal.slot === "dinner") current.dinner = meal;
      days.set(meal.day, current);
    }

    if (days.size >= 7) {
      return [...days.entries()]
        .sort((left, right) => left[0] - right[0])
        .flatMap(([day, meals]) => (meals.lunch && meals.dinner ? [{ day, lunch: meals.lunch, dinner: meals.dinner }] : []))
        .slice(0, 7);
    }

      return buildCookunitySevenDayMealPlan(brief.primaryKeyword, brief.secondaryKeywords).map((day) => ({
      day: day.day,
      lunch: {
        id: day.lunch.id,
        name: day.lunch.name,
        ...(day.lunch.chef ? { chef: day.lunch.chef } : {}),
        dietaryTags: day.lunch.dietaryTags,
        url: day.lunch.url,
        imageUrl: day.lunch.imageUrl,
        description: day.lunch.description,
        rating: day.lunch.rating,
        day: day.day,
        slot: "lunch",
        reason: `Recommended for day ${day.day} lunch.`,
      },
      dinner: {
        id: day.dinner.id,
        name: day.dinner.name,
        ...(day.dinner.chef ? { chef: day.dinner.chef } : {}),
        dietaryTags: day.dinner.dietaryTags,
        url: day.dinner.url,
        imageUrl: day.dinner.imageUrl,
        description: day.dinner.description,
        rating: day.dinner.rating,
        day: day.day,
        slot: "dinner",
        reason: `Recommended for day ${day.day} dinner.`,
      },
    }));
  }

  private buildAthleteMealPlanSections(brief: ContentBrief): Draft["sections"] {
    const secondaryA = brief.secondaryKeywords[0] ?? `${brief.primaryKeyword} guide`;
    const secondaryB = brief.secondaryKeywords[1] ?? `${brief.primaryKeyword} ideas`;
    const secondaryC = brief.secondaryKeywords[2] ?? `best ${brief.primaryKeyword}`;
    const mealPlanDays = this.buildMealPlanDays(brief);
    const dayContexts = [
      "Mid-morning training day",
      "Afternoon training day",
      "Active recovery day",
      "Early morning training day",
      "Night training day",
      "Rest and reset day",
      "Late afternoon training day",
    ];

    const daySections = mealPlanDays.map((dayPlan, index) => {
      const context = dayContexts[index] ?? `Training day ${dayPlan.day}`;
      const lunchChef = dayPlan.lunch.chef ? ` from Chef ${dayPlan.lunch.chef}` : "";
      const dinnerChef = dayPlan.dinner.chef ? ` from Chef ${dayPlan.dinner.chef}` : "";
      return {
        heading: `Day ${dayPlan.day}: ${context}`,
        level: 2,
        body: [
          `Lunch can carry the first big recovery job of the day. ${dayPlan.lunch.name}${lunchChef} works here because it gives the athlete a more complete midday meal: a meaningful protein anchor, enough substance to steady appetite, and the kind of practical structure that keeps the rest of the afternoon from sliding into snack-based improvisation.`,
          `Dinner should close the day without creating another project. ${dayPlan.dinner.name}${dinnerChef} fits that role because it keeps recovery-supportive food ready on the nights when training, commuting, and general fatigue make cooking the first thing to collapse.`,
          `This is what makes the weekly plan feel usable instead of aspirational. The meals are not random examples. They show how a real athlete week can keep lunch and dinner aligned with training demands while still using convenience strategically.`,
        ].join("\n\n"),
      };
    });

    return [
      {
        heading: "How athletes should think about a meal plan",
        level: 2,
        body: [
          `A practical meal plan for athletes has to do more than check nutrition boxes. It needs to support training load, protect recovery, and still fit inside a real week of work, commuting, school, travel, and shifting workout times.`,
          `The strongest plans are built around repeatable structure rather than perfection. Athletes need enough protein, enough total energy, and enough carbohydrate support to keep the week from unraveling once sessions get harder or schedules get tighter.`,
          `That is also why adjacent searches like ${secondaryA} and ${secondaryB} sit so close to the main topic. People are trying to make performance nutrition usable in real life, not just theoretically correct.`,
        ].join("\n\n"),
      },
      {
        heading: "Pre-workout and post-workout fueling basics",
        level: 2,
        body: [
          "Pre-workout meals usually work best when they emphasize digestible carbohydrate and leave enough room for comfort. The closer someone is eating to training, the simpler the food usually needs to be. If there is more time, the meal can include more fiber, more protein, and a little more fat without creating the same digestion tradeoff.",
          "Post-workout meals work best when they bring protein back in quickly and pair it with carbohydrate so the athlete can recover, replenish, and stabilize appetite for the rest of the day. The exact structure varies, but the principle stays steady: the session is part of the nutrition plan, not an afterthought.",
          `In practice, different timing windows call for different choices. An early session may only leave room for quick carbohydrate, while a later workout leaves more space for a fuller meal. The best guidance makes those differences concrete instead of flattening them into slogans.`,
        ].join("\n\n"),
      },
      {
        heading: "What a 7-day meal plan for athletes can look like",
        level: 2,
        body: [
          `The sample structure below is not a universal prescription. It is a realistic example of how an athlete might organize a week with a mix of training days, lighter days, and recovery windows. The point is to show what consistency can look like when real lunches and dinners are assigned to real days instead of being left as vague placeholders.`,
          `Across the week, the pattern stays recognizable: a stable breakfast, a lunch that supports the next block of the day, a smarter pre-workout or post-workout snack when needed, and a dinner that does enough recovery work without creating more friction than the athlete can sustain.`,
        ].join("\n\n"),
      },
      ...daySections,
      {
        heading: "Where CookUnity fits into an athlete meal plan",
        level: 2,
        body: [
          `CookUnity works best here as a way to keep the plan intact when time, energy, or schedule pressure would otherwise push the athlete toward lower-quality convenience food or skipped meals.`,
          `Chef-made quality, meal variety, and the practical value of having recovery-supportive dinners already handled matter because they support adherence. The real win is not abstract convenience. It is week-to-week consistency when the athlete has the least margin to cook.`,
          `That also speaks to long-tail demand like ${secondaryB}. People are often comparing systems, not just foods, and they want to know what actually makes it easier to keep eating well across a full training week.`,
        ].join("\n\n"),
      },
      {
        heading: "Bottom line",
        level: 2,
        body: [
          "A strong meal plan for athletes fuels training days, recovery days, and the messy in-between. It gives the reader a structure they can adapt, not a brittle script they will abandon the moment the week changes.",
          "The reader leaves with a clearer sense of timing, balance, and what a sustainable athlete meal plan actually looks like. That makes CookUnity practical: one more way to protect the plan on the days when consistency is hardest to keep.",
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
      `${brief.primaryKeyword} comes down to the reader’s real decision: what fits the week, tastes good, and feels easy enough to repeat.`,
      ...(brief.secondaryKeywords[0] ? [`${brief.secondaryKeywords[0]} matters when it adds practical context instead of extra keyword noise.`] : []),
      seoOpportunity
        ? `The opportunity is clear: ${seoOpportunity.toLowerCase()}.`
        : "The most useful guidance is practical, chef-aware, and rooted in real weeknight use.",
      ...(internalLink ? [`${internalLink} can help readers keep exploring once the core answer is clear.`] : []),
      ...(cta ? [`The next step can stay simple: ${cta}.`] : []),
    ].slice(0, 4);
  }

  private buildFallbackIntro(brief: ContentBrief): string {
    const support = brief.secondaryKeywords.slice(0, 2).join(" and ");
    return [
      `If you're evaluating ${brief.primaryKeyword}, the real question is not just what looks good on a landing page. It's what will still taste satisfying, feel convenient on a busy night, and hold up as part of your actual routine.`,
      `The answer starts there, then expands into ${support || "comparison criteria and practical examples"} so the decision feels complete. The goal is not a longer page for its own sake. The goal is enough useful detail that the reader can stop searching and start deciding.`,
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
