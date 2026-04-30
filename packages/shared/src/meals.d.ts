export interface CookunityMealCatalogEntry {
    id: string;
    slug: string;
    url: string;
    name: string;
    dietaryTags: string[];
    description: string;
    ingredients: string[];
    rating: number;
    chef: string;
    chefProfileUrl: string;
    imageUrl: string;
}
export interface CookunityMealSearchOptions {
    keyword: string;
    secondaryKeywords?: string[];
    filters?: string[];
    count?: number;
    slot?: "lunch" | "dinner" | "any";
    excludeIds?: string[];
}
export interface CookunityMealPlanDay {
    day: number;
    lunch: CookunityMealCatalogEntry;
    dinner: CookunityMealCatalogEntry;
}
export declare function inferCookunityMealFilters(keyword: string): string[];
export declare function getCookunityMealCatalog(): CookunityMealCatalogEntry[];
export declare function searchCookunityMeals(options: CookunityMealSearchOptions): CookunityMealCatalogEntry[];
export declare function buildCookunitySevenDayMealPlan(keyword: string, secondaryKeywords?: string[]): CookunityMealPlanDay[];
export declare function flattenMealPlanDays(keyword: string, secondaryKeywords?: string[]): ({
    id: string;
    name: string;
    chef: string;
    dietaryTags: string[];
    url: string;
    imageUrl: string;
    description: string;
    rating: number;
    day: number;
    slot: "lunch";
    reason: string;
} | {
    id: string;
    name: string;
    chef: string;
    dietaryTags: string[];
    url: string;
    imageUrl: string;
    description: string;
    rating: number;
    day: number;
    slot: "dinner";
    reason: string;
})[];
