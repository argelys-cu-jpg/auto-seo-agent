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
- What-Is style queries should currently inherit the Guide pattern.`;

export const topPerformingSeoArticlePattern = [
  sharedEditorialQualityBar,
  contentTypeEditorialPatterns,
  guideEditorialPattern,
  mealListicleEditorialPattern,
  recipeListicleEditorialPattern,
].join("\n\n");
