import type { ContentBrief, Draft, OptimizationTask, TopicCandidate } from "./types";

export const mockTopicCandidates: TopicCandidate[] = [
  {
    id: "topic_healthy_meal_delivery",
    keyword: "healthy prepared meal delivery",
    normalizedKeyword: "healthy prepared meal delivery",
    source: "ahrefs",
    searchVolume: 5400,
    keywordDifficulty: 21,
    trendVelocity: 18,
    businessRelevance: 96,
    conversionIntent: 91,
    serpIntentFit: 88,
    freshnessOpportunity: 52,
    competitorGap: 70,
    clusterValue: 84,
    authorityFit: 90,
    status: "queued",
    recommendation: "write_now",
    explanation:
      "High commercial intent and strong relevance to CookUnity with manageable difficulty and room for differentiation on chef-driven positioning.",
    relatedExistingContentIds: ["pub_meal_delivery_basics"],
    createdAt: "2026-03-18T09:00:00.000Z",
  },
  {
    id: "topic_mediterranean_meals",
    keyword: "mediterranean prepared meals",
    normalizedKeyword: "mediterranean prepared meals",
    source: "trends",
    searchVolume: 1900,
    keywordDifficulty: 17,
    trendVelocity: 24,
    businessRelevance: 92,
    conversionIntent: 84,
    serpIntentFit: 87,
    freshnessOpportunity: 61,
    competitorGap: 77,
    clusterValue: 74,
    authorityFit: 86,
    status: "outline_generated",
    recommendation: "write_now",
    explanation:
      "Cuisine-specific intent aligns with CookUnity menu discovery and supports a larger healthy-eating cluster.",
    relatedExistingContentIds: [],
    createdAt: "2026-03-18T09:15:00.000Z",
  },
];

export const mockBrief: ContentBrief = {
  id: "brief_healthy_meal_delivery",
  topicId: "topic_healthy_meal_delivery",
  primaryKeyword: "healthy prepared meal delivery",
  secondaryKeywords: [
    "healthy meal delivery service",
    "prepared healthy meals",
    "chef prepared meals",
  ],
  titleOptions: [
    "Healthy Prepared Meal Delivery: What to Look For",
    "How to Choose a Healthy Prepared Meal Delivery Service",
    "Healthy Prepared Meals That Fit Real Weeknights",
  ],
  intentSummary:
    "Searchers are comparing healthy meal delivery options and want practical guidance on quality, ingredients, convenience, and customization.",
  differentiators: [
    "Chef-crafted meals instead of generic plan-first language",
    "Menu variety across dietary preferences",
    "Prepared meal convenience without sacrificing food quality",
  ],
  recommendedInternalLinks: [
    {
      targetId: "pub_meal_delivery_basics",
      targetUrl: "/blog/what-is-prepared-meal-delivery",
      anchorText: "prepared meal delivery",
      rationale: "Supports top-of-funnel education and reinforces category authority.",
    },
  ],
  faqCandidates: [
    "Are healthy prepared meal delivery services worth it?",
    "How long do prepared meals stay fresh?",
    "Can healthy prepared meals support weight-loss goals?",
  ],
  faqSchemaDraft: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
  },
  requiredSources: [
    "CookUnity menu experience and dietary filter capabilities",
    "Freshness/storage guidance from operations team",
  ],
  factCheckChecklist: [
    "Validate freshness window",
    "Validate dietary filtering options",
    "Avoid unsupported health outcome claims",
  ],
  ctaRecommendations: [
    "Explore weekly menu",
    "See meals by dietary preference",
  ],
  briefJson: {
    sample: true,
  },
};

export const mockDraft: Draft = {
  id: "draft_healthy_meal_delivery",
  topicId: "topic_healthy_meal_delivery",
  briefId: "brief_healthy_meal_delivery",
  promptVersionId: "draft_v1",
  titleTagOptions: [
    "Healthy Prepared Meal Delivery Guide | CookUnity",
    "Best Healthy Prepared Meal Delivery Tips | CookUnity",
  ],
  metaDescriptionOptions: [
    "Learn what to look for in a healthy prepared meal delivery service, from ingredients and variety to convenience and chef-made quality.",
  ],
  slugRecommendation: "healthy-prepared-meal-delivery-guide",
  h1: "How to Choose a Healthy Prepared Meal Delivery Service",
  intro:
    "Healthy prepared meal delivery can save time, but not every service balances convenience, ingredient quality, and variety the same way.",
  sections: [
    {
      heading: "Key takeaways",
      level: 2,
      body: "Readers comparing healthy prepared meal delivery options usually care most about ingredient quality, menu variety, convenience, and whether the service feels realistic for everyday use.",
    },
    {
      heading: "What healthy prepared meal delivery should actually offer",
      level: 2,
      body: "Readers need clear criteria: ingredient transparency, balanced portions, menu rotation, and realistic convenience.",
    },
    {
      heading: "How services differ once you move past the marketing",
      level: 2,
      body: "The real differences usually come down to chef quality, flavor range, flexibility, delivery cadence, and freshness window rather than generic wellness language.",
    },
    {
      heading: "What to compare before you order",
      level: 2,
      body: "A useful comparison set includes menu rotation, dietary filters, ordering flexibility, storage guidance, and whether the meals feel satisfying enough to replace regular cooking during the week.",
    },
    {
      heading: "Why chef-crafted meals change the experience",
      level: 2,
      body: "CookUnity can differentiate on culinary quality, menu diversity, and food discovery.",
    },
    {
      heading: "Bottom line",
      level: 2,
      body: "The best option is the one that balances convenience with food quality and gives you enough variety to keep ordering practical over time.",
    },
  ],
  faq: [
    {
      question: "Are healthy prepared meal delivery services good for busy schedules?",
      answer: "They can be a strong fit when they reduce prep time without forcing you into repetitive menus.",
    },
  ],
  schemaSuggestions: ["FAQPage", "Article"],
  ctaSuggestions: ["Browse chef-crafted healthy meals", "See meals by dietary preference"],
  editorNotes: ["Verify references to freshness and dietary tags against live product data."],
  targetKeywords: ["healthy prepared meal delivery", "healthy meal delivery service"],
  competitorNotes: ["Competitors focus heavily on macros; CookUnity can lead with chef quality plus convenience."],
  revisionChecklist: ["Confirm meta title length", "Check internal link anchors", "Review YMYL phrasing"],
  html: "<article><h1>How to Choose a Healthy Prepared Meal Delivery Service</h1><p>Healthy prepared meal delivery can save time, but not every service balances convenience, ingredient quality, and variety the same way.</p><h2>Key takeaways</h2><p>Readers comparing healthy prepared meal delivery options usually care most about ingredient quality, menu variety, convenience, and whether the service feels realistic for everyday use.</p><h2>What healthy prepared meal delivery should actually offer</h2><p>Readers need clear criteria: ingredient transparency, balanced portions, menu rotation, and realistic convenience.</p><h2>How services differ once you move past the marketing</h2><p>The real differences usually come down to chef quality, flavor range, flexibility, delivery cadence, and freshness window rather than generic wellness language.</p><h2>What to compare before you order</h2><p>A useful comparison set includes menu rotation, dietary filters, ordering flexibility, storage guidance, and whether the meals feel satisfying enough to replace regular cooking during the week.</p><h2>Why chef-crafted meals change the experience</h2><p>CookUnity can differentiate on culinary quality, menu diversity, and food discovery.</p><h2>Bottom line</h2><p>The best option is the one that balances convenience with food quality and gives you enough variety to keep ordering practical over time.</p><h2>Frequently Asked Questions</h2><h3>Are healthy prepared meal delivery services good for busy schedules?</h3><p>They can be a strong fit when they reduce prep time without forcing you into repetitive menus.</p></article>",
  createdAt: "2026-03-18T10:00:00.000Z",
};

export const mockOptimizationTask: OptimizationTask = {
  id: "opt_ctr_refresh_1",
  topicId: "topic_healthy_meal_delivery",
  publicationId: "pub_healthy_meal_delivery",
  type: "improve_ctr",
  priority: "high",
  reason: "Impressions increased 34% over 28 days but CTR fell from 2.8% to 1.6%.",
  actions: [
    "Test a stronger title emphasizing chef-crafted meals",
    "Refresh meta description with comparison framing",
    "Add FAQ targeting cost/value objections",
  ],
  metricsContext: {
    impressionsDelta28d: 0.34,
    ctrDelta28d: -0.012,
  },
  createdAt: "2026-03-18T11:00:00.000Z",
};
