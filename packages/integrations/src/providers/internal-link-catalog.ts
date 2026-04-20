export interface InternalLinkCatalogEntry {
  keyword: string;
  link: string;
  category: "cuisine" | "diet" | "protein" | "city";
}

export const internalLinkCatalog: InternalLinkCatalogEntry[] = [
  { keyword: "Italian meal delivery", link: "https://www.cookunity.com/cuisines/italian", category: "cuisine" },
  { keyword: "Japanese meal delivery", link: "https://www.cookunity.com/cuisines/japanese", category: "cuisine" },
  { keyword: "Mexican meal delivery", link: "https://www.cookunity.com/cuisines/mexican", category: "cuisine" },
  { keyword: "Mediterranean meal delivery", link: "https://www.cookunity.com/cuisines/mediterranean", category: "cuisine" },
  { keyword: "Indian meal delivery", link: "https://www.cookunity.com/cuisines/indian", category: "cuisine" },
  { keyword: "Thai meal delivery", link: "https://www.cookunity.com/cuisines/thai", category: "cuisine" },
  { keyword: "Gluten Free Meal Delivery", link: "https://www.cookunity.com/diets/gluten-free", category: "diet" },
  { keyword: "Keto Meal Delivery", link: "https://www.cookunity.com/diets/keto", category: "diet" },
  { keyword: "Vegan Meal Delivery", link: "https://www.cookunity.com/diets/vegan", category: "diet" },
  { keyword: "Vegetarian Meal Delivery", link: "https://www.cookunity.com/diets/vegetarian", category: "diet" },
  { keyword: "Low Carb Meal Delivery", link: "https://www.cookunity.com/diets/low-carb", category: "diet" },
  { keyword: "Low Sodium Meal Delivery", link: "https://www.cookunity.com/diets/low-sodium", category: "diet" },
  { keyword: "Dairy Free Meal Delivery", link: "https://www.cookunity.com/diets/dairy-free", category: "diet" },
  { keyword: "Paleo Meal Delivery", link: "https://www.cookunity.com/diets/paleo", category: "diet" },
  { keyword: "Chicken meal delivery", link: "https://www.cookunity.com/proteins/chicken", category: "protein" },
  { keyword: "Salmon meal delivery", link: "https://www.cookunity.com/proteins/salmon", category: "protein" },
  { keyword: "Steak meal delivery", link: "https://www.cookunity.com/proteins/steak", category: "protein" },
  { keyword: "Shrimp meal delivery", link: "https://www.cookunity.com/proteins/shrimp", category: "protein" },
  { keyword: "Tofu meal delivery", link: "https://www.cookunity.com/proteins/tofu", category: "protein" },
  { keyword: "NYC meal delivery", link: "https://www.cookunity.com/cities/nyc", category: "city" },
  { keyword: "Miami meal delivery", link: "https://www.cookunity.com/cities/miami", category: "city" },
  { keyword: "Chicago meal delivery", link: "https://www.cookunity.com/cities/chicago", category: "city" },
  { keyword: "Los Angeles meal delivery", link: "https://www.cookunity.com/cities/los-angeles", category: "city" },
  { keyword: "Austin meal delivery", link: "https://www.cookunity.com/cities/austin", category: "city" },
];

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function identifyMainInternalLink(keyword: string) {
  const targetTokens = new Set(tokenize(keyword));
  let best: InternalLinkCatalogEntry | null = null;
  let bestScore = 0;

  for (const entry of internalLinkCatalog) {
    const entryTokens = tokenize(entry.keyword);
    const overlap = entryTokens.filter((token) => targetTokens.has(token)).length;
    const score = overlap / Math.max(entryTokens.length, 1);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  if (!best || bestScore < 0.34) {
    return { keyword: "", link: "" };
  }

  return { keyword: best.keyword, link: best.link };
}
