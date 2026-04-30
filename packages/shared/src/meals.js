import mealCatalogJson from "./data/cookunity-meals.json";
const mealCatalog = mealCatalogJson;
const tagAliases = {
    "gluten free": "gluten free",
    "dairy free": "dairy free",
    vegan: "vegan",
    vegetarian: "vegetarian",
    pescatarian: "pescatarian",
    "pescatarian diet": "pescatarian",
    paleo: "paleo",
    "keto diet": "keto",
    keto: "keto",
    "low carb": "low carb",
    "low carbs": "low carb",
    "low sugar": "low sugar",
    "low sodium": "low sodium",
    "mediterranean diet": "mediterranean",
    mediterranean: "mediterranean",
    "high protein": "high protein",
    "less than 600 calories": "less than 600 calories",
};
const lunchIndicators = [
    "bowl",
    "salad",
    "wrap",
    "pita",
    "sandwich",
    "quinoa",
    "grain",
    "rice",
    "chickpea",
    "burger",
];
const dinnerIndicators = [
    "steak",
    "salmon",
    "chicken",
    "pork",
    "lamb",
    "meatball",
    "pasta",
    "curry",
    "thigh",
    "loin",
    "roasted",
];
function normalizeTag(value) {
    const normalized = value.toLowerCase().trim();
    return tagAliases[normalized] ?? normalized;
}
function tokenize(values) {
    return values
        .flatMap((value) => value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3))
        .filter((token, index, all) => all.indexOf(token) === index);
}
function inferAthleteBoost(meal, haystack) {
    let score = 0;
    const tags = meal.dietaryTags.map(normalizeTag);
    if (tags.includes("high protein"))
        score += 30;
    if (tags.includes("low sugar"))
        score += 10;
    if (haystack.includes("salmon"))
        score += 10;
    if (haystack.includes("chicken"))
        score += 10;
    if (haystack.includes("steak"))
        score += 8;
    if (haystack.includes("turkey"))
        score += 8;
    if (haystack.includes("quinoa"))
        score += 7;
    if (haystack.includes("rice"))
        score += 6;
    if (haystack.includes("potato"))
        score += 6;
    if (haystack.includes("greens"))
        score += 4;
    return score;
}
function scoreMeal(meal, keyword, secondaryKeywords, filters, slot) {
    const normalizedTags = meal.dietaryTags.map(normalizeTag);
    const haystack = `${meal.name} ${meal.description} ${meal.ingredients.join(" ")} ${normalizedTags.join(" ")}`.toLowerCase();
    const tokens = tokenize([keyword, ...secondaryKeywords]);
    let score = meal.rating * 12;
    for (const filter of filters.map(normalizeTag)) {
        if (normalizedTags.includes(filter)) {
            score += 40;
        }
        else {
            score -= 80;
        }
    }
    if (slot === "lunch") {
        if (lunchIndicators.some((indicator) => haystack.includes(indicator)))
            score += 18;
        if (dinnerIndicators.some((indicator) => haystack.includes(indicator)))
            score += 4;
    }
    else if (slot === "dinner") {
        if (dinnerIndicators.some((indicator) => haystack.includes(indicator)))
            score += 18;
        if (lunchIndicators.some((indicator) => haystack.includes(indicator)))
            score += 4;
    }
    for (const token of tokens) {
        if (meal.name.toLowerCase().includes(token)) {
            score += 12;
            continue;
        }
        if (meal.description.toLowerCase().includes(token)) {
            score += 6;
            continue;
        }
        if (haystack.includes(token)) {
            score += 3;
        }
    }
    if (keyword.toLowerCase().includes("athlete")) {
        score += inferAthleteBoost(meal, haystack);
    }
    if (keyword.toLowerCase().includes("meal plan")) {
        if (haystack.includes("balanced"))
            score += 8;
        if (haystack.includes("vegetable"))
            score += 5;
        if (haystack.includes("weeknight"))
            score += 5;
    }
    return score;
}
function buildReason(meal, keyword, slot, day) {
    const parts = [];
    const normalizedTags = meal.dietaryTags.map(normalizeTag);
    if (day && slot !== "any") {
        parts.push(`Recommended for day ${day} ${slot}`);
    }
    else if (slot !== "any") {
        parts.push(`Strong ${slot} fit`);
    }
    else {
        parts.push("Strong editorial proof point");
    }
    if (keyword.toLowerCase().includes("athlete") && normalizedTags.includes("high protein")) {
        parts.push("high-protein profile supports recovery");
    }
    if (normalizedTags.includes("gluten free")) {
        parts.push("gluten-free");
    }
    if (normalizedTags.includes("low carb")) {
        parts.push("lower-carb option");
    }
    if (meal.rating >= 4) {
        parts.push(`rated ${meal.rating.toFixed(1)}`);
    }
    return parts.join("; ");
}
export function inferCookunityMealFilters(keyword) {
    const lowered = keyword.toLowerCase();
    const filters = [];
    if (lowered.includes("keto"))
        filters.push("keto");
    if (lowered.includes("vegan"))
        filters.push("vegan");
    if (lowered.includes("vegetarian"))
        filters.push("vegetarian");
    if (lowered.includes("gluten free"))
        filters.push("gluten free");
    if (lowered.includes("dairy free"))
        filters.push("dairy free");
    if (lowered.includes("low sodium"))
        filters.push("low sodium");
    if (lowered.includes("low carb"))
        filters.push("low carb");
    if (lowered.includes("paleo"))
        filters.push("paleo");
    if (lowered.includes("mediterranean"))
        filters.push("mediterranean");
    if (lowered.includes("athlete") || lowered.includes("high protein"))
        filters.push("high protein");
    return filters.filter((value, index, all) => all.indexOf(value) === index);
}
export function getCookunityMealCatalog() {
    return mealCatalog;
}
export function searchCookunityMeals(options) {
    const { keyword, secondaryKeywords = [], filters = inferCookunityMealFilters(keyword), count = 12, slot = "any", excludeIds = [], } = options;
    const excluded = new Set(excludeIds);
    return mealCatalog
        .filter((meal) => !excluded.has(meal.id))
        .map((meal) => ({
        meal,
        score: scoreMeal(meal, keyword, secondaryKeywords, filters, slot),
    }))
        .sort((left, right) => right.score - left.score)
        .slice(0, count)
        .map((entry) => entry.meal);
}
export function buildCookunitySevenDayMealPlan(keyword, secondaryKeywords = []) {
    const filters = inferCookunityMealFilters(keyword);
    const lunches = searchCookunityMeals({
        keyword,
        secondaryKeywords,
        filters,
        count: 7,
        slot: "lunch",
    });
    const dinners = searchCookunityMeals({
        keyword,
        secondaryKeywords,
        filters,
        count: 14,
        slot: "dinner",
        excludeIds: lunches.map((meal) => meal.id),
    });
    const fallbackPool = searchCookunityMeals({
        keyword,
        secondaryKeywords,
        filters,
        count: 28,
        slot: "any",
        excludeIds: [...lunches.map((meal) => meal.id), ...dinners.map((meal) => meal.id)],
    });
    const days = [];
    for (let index = 0; index < 7; index += 1) {
        const lunch = lunches[index] ?? fallbackPool[index];
        const dinner = dinners[index] ?? fallbackPool[index + 7] ?? fallbackPool[index];
        if (!lunch || !dinner) {
            break;
        }
        days.push({
            day: index + 1,
            lunch,
            dinner,
        });
    }
    return days;
}
export function flattenMealPlanDays(keyword, secondaryKeywords = []) {
    return buildCookunitySevenDayMealPlan(keyword, secondaryKeywords).flatMap((day) => [
        {
            id: `${day.lunch.id}_day_${day.day}_lunch`,
            name: day.lunch.name,
            chef: day.lunch.chef,
            dietaryTags: day.lunch.dietaryTags,
            url: day.lunch.url,
            imageUrl: day.lunch.imageUrl,
            description: day.lunch.description,
            rating: day.lunch.rating,
            day: day.day,
            slot: "lunch",
            reason: buildReason(day.lunch, keyword, "lunch", day.day),
        },
        {
            id: `${day.dinner.id}_day_${day.day}_dinner`,
            name: day.dinner.name,
            chef: day.dinner.chef,
            dietaryTags: day.dinner.dietaryTags,
            url: day.dinner.url,
            imageUrl: day.dinner.imageUrl,
            description: day.dinner.description,
            rating: day.dinner.rating,
            day: day.day,
            slot: "dinner",
            reason: buildReason(day.dinner, keyword, "dinner", day.day),
        },
    ]);
}
//# sourceMappingURL=meals.js.map