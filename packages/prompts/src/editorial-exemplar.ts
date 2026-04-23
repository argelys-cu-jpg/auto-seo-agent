export const sharedEditorialQualityBar = `Use these editorial rules when building CookUnity briefs and drafts.

This is not source text to copy. It is a quality reference for what "good" looks like:

- Open with a sharp, readable introduction that frames the topic in plain language.
- Put a Key takeaways section near the top with concrete, skimmable bullets.
- Keep sections useful and specific rather than abstract. Readers should get practical guidance, not commentary about what the article should do.
- Follow the main body with supporting sections that help the reader act on the advice.
- End with a brief conclusion or final thoughts section that closes the loop cleanly.
- Include an FAQ section with direct answers to obvious follow-up questions.

Signals of strong execution:

- high information scent from the top of the page
- scannable structure with real subheadings
- explicit fulfillment of the search promise
- practical examples instead of vague category talk
- clear answer-first writing that works well for AEO and LLM retrieval

Avoid:

- outline-like filler
- instructions to the editor inside the draft
- placeholder phrasing such as "this section should"
- generic SEO padding that repeats the keyword without adding meaning`;

export const guideEditorialPattern = `Guide pattern:

- Use a clean explainer structure.
- Answer the basic "what is it?" or "how does it work?" question early.
- If the query implies a plan, fulfill it explicitly with a complete day-by-day or step-by-step section.
- Follow the main explainer with benefits, implications, or tradeoffs when that supports intent.
- Keep the conclusion brief and decisive.

Signals of a strong guide:

- a clear explainer section near the top
- a complete plan section when the title promises one
- practical interpretation instead of abstract category filler`;

export const whatIsEditorialPattern = `What-Is pattern:

- Open with a direct definition in the first section after the intro.
- Explain how the concept works before moving into broader benefits or implications.
- Use simple tables or bullets when they clarify terminology, mechanisms, or comparisons.
- Include both benefits and risks when the topic can affect health, behavior, or decision-making.
- Add a "how to start" or "how to apply it" section so the reader can act on the explanation.
- Use an FAQ section that answers the obvious objections and edge cases.
- Include sources or expert grounding when the topic involves nutrition, health, or expert-backed guidance.

Signals of a strong What-Is article:

- fast, explicit answer to the core definitional question
- useful explanation of mechanism, not just a label
- balanced treatment of upside and downside
- practical next-step guidance after the explainer
- expert or source-backed framing when the topic demands trust`;

export const mealListicleEditorialPattern = `Meal listicle pattern:

- If the query implies a recommendation list, define the selection criteria before the list so the reader knows what "good" means.
- Fulfill the list promise explicitly with a complete numbered list.
- Make each list item useful: explain what it is, why it belongs, and what makes it a good fit.
- Add pragmatic support sections after the main list when they help intent, such as prep guidance, usage timing, or decision criteria.
- Use a complete FAQ section that answers obvious follow-up questions.

Signals of a strong meal listicle:

- listicles that feel complete rather than padded
- useful "what makes a good option" framing before recommendations
- practical follow-through sections that help the reader act on the advice
- recommendation lists that explain why each option matters, not just what it is`;

export const recipeListicleEditorialPattern = `Recipe listicle pattern:

- Group recipes by meal occasion or use case when that improves scanability, such as breakfast, lunch, dinner, or snacks.
- Fulfill the recipe promise explicitly with a complete numbered list of recipes.
- For each recipe, include enough practical detail to feel usable: ingredients, directions, and a short setup line when useful.
- Keep the recipes concise, but specific enough that the reader understands what they would actually make or eat.
- After the main recipe body, add support sections that help the reader use the recipes in real life, such as pantry essentials, prep strategy, or safety considerations.
- Use a strong CookUnity bridge section near the bottom when relevant, showing how chef-prepared meals solve the same use case without sounding forced.

Signals of a strong recipe listicle:

- meal-based grouping that makes the article easy to browse
- recipes that feel concrete rather than teaser-level
- ingredient and direction formatting that supports quick scanning
- a useful chef or prep tip where it genuinely adds value
- a bridge from recipe inspiration into CookUnity that feels contextual, not bolted on`;

export const contentTypeEditorialPatterns = `Use the matching pattern for the content format:

- Guide: follow the Guide pattern.
- Listicle: if it is food, meal, or snack oriented, follow the Meal Listicle pattern.
- Recipe Listicle: follow the Recipe Listicle pattern.
- What-Is style queries should follow the What-Is pattern.`;

export const stepByStepAnalysisQualityBar = `Before generating the brief, do a real pre-brief analysis package with this level of depth:

- Persona and search intent analysis:
  - who is searching
  - why they are searching
  - pain points
  - desired outcomes
  - core questions
  - leftover questions competitors did not fully answer
  - top secondary keywords that matter most
- Competitor header analysis:
  - what each major competitor heading is trying to answer
  - the SEO rationale for that section
  - whether a similar section should be included
- Article synthesis:
  - full list of questions the article must answer
  - common subtopics and follow-up questions
  - common sequencing and header syntax patterns
  - FAQ opportunities
  - title-to-topic alignment
- Outline development:
  - initial H2 set
  - H2/H3 development
  - FAQ plan
  - refined outline narrative
- CookUnity positioning:
  - how the brand should relate to the topic
  - unique value to weave in
  - SEO opportunities competitors leave open
  - which meals or menu proof points can appear naturally
  - the right CTA direction for the path
- Outline evaluation:
  - whether the sequence is complete, SEO-fit, and structurally sound

Do not jump straight from keyword to outline. The brief should clearly reflect that this analysis happened first.`;

export const topPerformingSeoArticlePattern = [
  sharedEditorialQualityBar,
  stepByStepAnalysisQualityBar,
  contentTypeEditorialPatterns,
  guideEditorialPattern,
  whatIsEditorialPattern,
  mealListicleEditorialPattern,
  recipeListicleEditorialPattern,
].join("\n\n");
