"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { KeywordOption, OpportunityPath, OpportunityType, OutlinePackage } from "@cookunity-seo-agent/shared";
import { Badge } from "./cards";
import type { GridOpportunityDetail, GridOpportunityRow, GridStepView } from "../lib/workflow-grid-store";

const orderedSteps = ["discovery", "prioritization", "brief", "draft", "qa", "publish"] as const;

function cellTone(status: string) {
  switch (status) {
    case "approved":
    case "completed":
      return { background: "#e3efe8", color: "#1f4d38" };
    case "needs_review":
      return { background: "#f7e7d3", color: "#8b4f14" };
    case "failed":
      return { background: "#f7dddd", color: "#8b1c1c" };
    case "running":
      return { background: "#e3edf8", color: "#1e4f86" };
    default:
      return { background: "#efe9df", color: "#5d564f" };
  }
}

function rowTone(status: string) {
  switch (status) {
    case "published":
      return "#e3efe8";
    case "needs_review":
      return "#fff7ec";
    case "blocked":
      return "#f7e7d3";
    case "failed":
      return "#fbe6e6";
    case "approved":
      return "#edf3fe";
    default:
      return "#fffdf9";
  }
}

function stepActionLabel(step?: GridStepView) {
  if (!step || step.version === 0 || step.status === "not_started") return "Run workflow";
  if (step.status === "needs_review") return "Review needed";
  if (step.status === "failed") return "Retry step";
  if (step.status === "running") return "Running";
  return "View output";
}

function stepActionTone(step?: GridStepView) {
  if (!step || step.version === 0 || step.status === "not_started") return "#2563eb";
  if (step.status === "needs_review") return "#d97706";
  if (step.status === "failed") return "#dc2626";
  if (step.status === "running") return "#2563eb";
  return "#1f7a39";
}

function stepPreview(step?: GridStepView) {
  if (!step?.output && !step?.manualOutput) return "";
  const payload = (step.manualOutput ?? step.output) as Record<string, unknown>;
  if (typeof payload.h1 === "string") return payload.h1;
  if (typeof payload.intentSummary === "string") return payload.intentSummary;
  if (typeof payload.explanation === "string") return payload.explanation;
  if (typeof payload.reviewLabel === "string") return payload.reviewLabel;
  if (typeof payload.message === "string") return payload.message;
  return "";
}

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const raw = await response.text();
  let payload:
    | { success: boolean; message?: string; warning?: string; result?: GridOpportunityDetail & { id: string } }
    | null = null;

  if (raw) {
    try {
      payload = JSON.parse(raw) as { success: boolean; message?: string; warning?: string; result?: GridOpportunityDetail & { id: string } };
    } catch {
      throw new Error(raw.slice(0, 240));
    }
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? raw.slice(0, 240) ?? "Request failed.");
  }
  return payload;
}

function applyDetailToRows(
  current: GridOpportunityRow[],
  nextDetail: GridOpportunityDetail,
): GridOpportunityRow[] {
  const existingIndex = current.findIndex((row) => row.id === nextDetail.id);
  if (existingIndex === -1) {
    return [nextDetail, ...current.filter((row) => !row.id.startsWith("pending_"))];
  }
  const nextRows = [...current];
  nextRows[existingIndex] = nextDetail;
  return nextRows;
}

function titleizeKeyword(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function keywordToSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function inferLocalOutlineHeadings(row: GridOpportunityRow) {
  const normalized = row.keyword.toLowerCase();
  if (normalized.includes("athlete")) {
    return [
      "Key takeaways",
      "Start with the energy demands of the week",
      "Build each meal around protein and recovery",
      "Use carbohydrates strategically instead of avoiding them",
      "Make the plan realistic for training days and rest days",
      "Keep convenience high enough to stay consistent",
      "Frequently asked questions",
      "Bottom line",
    ];
  }
  if (normalized.includes("meal plan")) {
    return [
      "Key takeaways",
      "Define the goal before building the week",
      "Choose meals that are easy to repeat",
      "Balance protein, carbohydrates, and vegetables across the day",
      "Plan for the days most likely to break the routine",
      "Use prepared meals to reduce decision fatigue",
      "Frequently asked questions",
      "Bottom line",
    ];
  }
  return [
    "Key takeaways",
    "What readers need to understand first",
    "How to evaluate the best option",
    "What matters most in real-life use",
    "Where CookUnity fits the decision",
    "Frequently asked questions",
    "Bottom line",
  ];
}

function buildLocalOutlinePackage(row: GridOpportunityRow): OutlinePackage {
  const title = titleizeKeyword(row.keyword);
  const slug = keywordToSlug(row.keyword);
  const headings = inferLocalOutlineHeadings(row);

  return {
    primaryKeyword: row.keyword,
    contentFormat: row.keyword.toLowerCase().includes("best") || row.keyword.toLowerCase().includes("ideas") ? "listicle" : "guide",
    keywordOverview: {
      keyword: row.keyword,
      searchVolume: row.searchVolume ?? 1200,
      keywordDifficulty: 32,
      competition: 0.46,
      cpc: 2.1,
      resultsCount: 125000,
    },
    mainInternalLink: {
      keyword: row.path === "blog" ? "Prepared meal delivery" : "Meal delivery service",
      link: row.path === "blog" ? "https://www.cookunity.com/blog" : "https://www.cookunity.com/",
    },
    keywordList: [
      { keyword: row.keyword, searchVolume: row.searchVolume ?? 1200 },
      { keyword: `${row.keyword} guide`, searchVolume: 600 },
      { keyword: `best ${row.keyword}`, searchVolume: 450 },
    ],
    popularFoods: [],
    serpResults: [],
    competitors: [],
    competitorKeywordRollup: [],
    titleOptions: [title, `${title} guide`, `How to choose ${row.keyword}`],
    selectedTitle: title,
    slugOptions: [slug, `${slug}-guide`],
    selectedSlug: slug,
    secondaryKeywordOptions: [
      { keyword: `${row.keyword} guide`, searchVolume: 600 },
      { keyword: `best ${row.keyword}`, searchVolume: 450 },
      { keyword: `${row.keyword} ideas`, searchVolume: 320 },
    ],
    selectedSecondaryKeywords: [
      { keyword: `${row.keyword} guide`, searchVolume: 600 },
      { keyword: `best ${row.keyword}`, searchVolume: 450 },
    ],
    internalLinks: [
      {
        label: "Menu",
        url: "https://www.cookunity.com/menus",
        anchorText: "CookUnity weekly menu",
      },
      {
        label: "How it works",
        url: "https://www.cookunity.com/how-it-works",
        anchorText: "how CookUnity works",
      },
    ],
    mealRecommendations: [
      {
        id: "local_meal_1",
        name: "Seared salmon with seasonal vegetables",
        chef: "CookUnity",
        dietaryTags: ["high protein"],
        reason: "Shows how prepared meals can still support performance and consistency.",
      },
      {
        id: "local_meal_2",
        name: "Chicken bowl with grains and greens",
        chef: "CookUnity",
        dietaryTags: ["balanced"],
        reason: "Useful example of a weekday meal that covers recovery and convenience together.",
      },
    ],
    analysis: {
      persona: row.path === "blog" ? "Reader looking for a workable answer before committing to a solution" : "High-intent shopper comparing meal solutions",
      searchIntent: row.path === "blog" ? "Informational with evaluation intent" : "Commercial and conversion-oriented",
      competitorSummary: `The local fallback brief assumes the top competing pages are either generic meal planning articles or thin commercial pages that do not explain how to make ${row.keyword} sustainable in real life.`,
      seoOpportunities: [
        "Answer the core reader question immediately",
        "Use a stronger structure than generic category pages",
        "Bridge naturally into CookUnity without turning the article into a sales pitch too early",
      ],
      faqRecommendations: [
        `How do you make ${row.keyword} realistic for busy weekdays?`,
        `What should you prioritize first with ${row.keyword}?`,
      ],
      mealPlacementSuggestions: [
        "Use one meal example early to make the category concrete",
        "Use another example near the close to connect the topic to menu exploration",
      ],
      outline: headings.map((heading) => ({
        heading,
        level: 2,
        notes: `Cover ${heading.toLowerCase()} with clear, written guidance instead of framework language.`,
      })),
    },
    reviewState: {
      titleApproved: false,
      secondaryKeywordsApproved: false,
    },
  };
}

function buildLocalKeyTakeaways(row: GridOpportunityRow) {
  if (row.path === "landing_page") {
    return [
      "Lead with what shoppers actually compare: flavor, flexibility, and whether dinner feels easier by Wednesday, not just on day 1.",
      "Explain why chef-made prepared meals fit real schedules better than ingredient-heavy alternatives that still demand time and cleanup.",
      "Use a direct CTA only after the page has earned trust and made the fit feel obvious.",
    ];
  }

  if (row.keyword.toLowerCase().includes("athlete")) {
    return [
      "A workable athlete meal plan should support training load, recovery, and consistency at the same time.",
      "Protein matters, but so do total energy intake and well-timed carbohydrates when training volume climbs.",
      "Prepared meals can keep the plan intact on the days when cooking is the first thing to collapse.",
    ];
  }

  return [
    "Readers want a practical answer they can use this week, not a generic overview dressed up as advice.",
    "The article should connect convenience, quality, and repeatability in language that feels editorial and grounded.",
    "A strong close should bridge naturally from useful guidance into menu exploration or capture.",
  ];
}

function buildLocalDraftHtml(row: GridOpportunityRow, title: string) {
  const keyTakeawaysHtml = `<h2>Key takeaways</h2><ul>${buildLocalKeyTakeaways(row)
    .map((item) => `<li>${item}</li>`)
    .join("")}</ul>`;
  const normalized = row.keyword.toLowerCase();
  if (row.path === "landing_page") {
    return `<article>
<h1>${title}</h1>
<p>People looking for ${row.keyword} are usually close to a decision. They are trying to figure out whether a meal delivery service will actually make life easier, whether the food will taste good enough to look forward to, and whether the whole thing will still feel worth it once the novelty wears off.</p>
<p>CookUnity should lead with meals from real chefs, strong weekly variety, and the relief of having dinner handled without another round of planning, shopping, chopping, or cleanup. That combination is what makes the offer feel genuinely useful, not just convenient in theory.</p>
${keyTakeawaysHtml}
<h2>Why this category matters in real life</h2>
<p>Shoppers in this category are rarely comparing abstract features. They are comparing the lived experience of getting through a packed week with less friction and better food. The strongest copy should reflect that reality from the first screen.</p>
<p>That means emphasizing convenience, but not in a cheap or generic way. The right message is that CookUnity removes work while still feeling like a meal you would actually look forward to eating.</p>
<h2>What people compare before they commit</h2>
<p>Most visitors compare flexibility, menu range, dietary fit, and whether the service seems realistic for their schedule. They also want to know if the quality will feel consistent enough to justify ordering again after the first box arrives.</p>
<p>This is where the page should help them think clearly. Spell out what matters: the number of weekly options, the ability to skip or adjust, and the difference between prepared meals and products that still require cooking.</p>
<h2>How CookUnity should position the offer</h2>
<p>CookUnity stands out when the page makes a simple promise: restaurant-quality prepared meals with enough variety to stay interesting across the week. The positioning should feel grounded, specific, and closely tied to everyday routines.</p>
<p>That matters because many competing pages rely on broad lifestyle language instead of showing why the product fits into a real calendar. CookUnity should sound more operational, more useful, and more honest.</p>
<h2>What turns interest into action</h2>
<p>Interest becomes action when the visitor can see a clear next step. Show what the menu looks like, make the value proposition concrete, and keep the CTA close to the proof. The page should reduce uncertainty rather than forcing the visitor to guess what happens next.</p>
<p>If the visitor leaves with a better sense of meal quality, flexibility, and relevance to their routine, the page has done its job.</p>
<h2>Bottom line</h2>
<p>Close with a direct trial CTA. The final message should be simple: if you want prepared meals that feel high-quality and reduce weeknight effort, CookUnity gives you a stronger starting point than a generic subscription promise.</p>
</article>`;
  }

  if (normalized.includes("athlete")) {
    return `<article>
<h1>${title}</h1>
<p>A good meal plan for athletes does not need to be perfect to be effective. It needs to be repeatable. Most athletes already know they should eat enough protein, recover well, and stay consistent through busy weeks. The harder part is building a structure that actually survives travel, work, early training sessions, and the days when cooking falls apart.</p>
<p>The strongest plan starts by matching food intake to training reality. That means enough calories to support workload, enough protein to help recovery, enough carbohydrates to keep energy available, and enough convenience to make the whole thing realistic for more than a few determined days.</p>
${keyTakeawaysHtml}
<h2>Start with the energy demands of the week</h2>
<p>Before choosing individual meals, it helps to look at the week as a whole. Hard training days, double sessions, and long workdays create very different energy needs than lighter recovery days. Athletes who undereat on the busiest days often feel it first in performance, recovery, and appetite swings later in the week.</p>
<p>A more useful approach is to think in ranges rather than rigid rules. Heavier days need more support, especially from carbohydrates and total calories, while lighter days can stay simpler without becoming restrictive.</p>
<h2>Build each meal around protein and recovery</h2>
<p>Protein is the easiest place to create consistency. A meal plan becomes much easier to follow when each lunch and dinner already starts with a meaningful protein source, then builds out with vegetables, grains, legumes, or other recovery-supporting sides.</p>
<p>For most athletes, the goal is not to chase a perfect number in every meal. The goal is to make sure protein shows up often enough that recovery does not depend on a single shake or an oversized dinner at the end of the day.</p>
<h2>Use carbohydrates strategically instead of avoiding them</h2>
<p>Carbohydrates are often the difference between feeling fueled and constantly feeling flat. Athletes who train hard usually benefit from using carbohydrates around sessions rather than treating them as something to minimize by default.</p>
<p>That can look simple in practice: grains, potatoes, fruit, or legumes on training days, and meals that leave enough room to recover without feeling heavy. The plan works best when the food supports performance instead of fighting it.</p>
<h2>Make the plan realistic for training days and rest days</h2>
<p>The biggest mistake in athlete meal planning is pretending every day looks the same. It doesn’t. Some days require speed and convenience, while others leave enough room for a slower meal or more prep at home.</p>
<p>A workable plan accounts for both. Training days should remove friction, and rest days should help reset the week without turning meal prep into a second job.</p>
<h2>Keep convenience high enough to stay consistent</h2>
<p>Consistency usually breaks when the plan depends on too much cooking, too much cleanup, or too many decisions at the exact moment energy is lowest. That is where prepared meals can help: they reduce friction without forcing athletes into repetitive or low-quality choices.</p>
<p>For CookUnity, the relevant angle is not “healthy meals” in the abstract. It is the ability to have balanced, satisfying meals ready on the nights when training, work, and recovery leave very little room for more effort.</p>
<h2>Frequently asked questions</h2>
<h3>Should athletes eat the same way every day?</h3>
<p>Not necessarily. The best plans flex with training load, appetite, and schedule. What matters most is keeping the core structure strong enough that hard days are supported and lighter days still feel balanced.</p>
<h3>What makes a meal plan sustainable?</h3>
<p>Sustainability usually comes from simplicity and repetition. When meals are easy to access, enjoyable to eat, and flexible enough for the real week, the plan stops feeling like a separate project.</p>
<h2>Bottom line</h2>
<p>A strong meal plan for athletes should support performance, recovery, and consistency at the same time. If prepared meals make it easier to stay on plan during the busiest parts of the week, they can be a meaningful part of the solution rather than a compromise.</p>
</article>`;
  }

  return `<article>
<h1>${title}</h1>
<p>Most people looking for ${row.keyword} are not searching for theory. They want a workable answer that fits into a busy schedule and helps them make a better decision today. Usually that means understanding what matters most, what mistakes to avoid, and how to choose something they can actually stick with once real life barges in.</p>
<p>For CookUnity, the opportunity is to deliver that clarity in plain language and then make the next step obvious. The article should feel useful first and persuasive second, with enough texture that it sounds like it was written by someone who actually cares what dinner tastes like.</p>
${keyTakeawaysHtml}
<h2>Define the goal before building the week</h2>
<p>Any useful plan starts with the real constraint. Sometimes the issue is lack of time. Sometimes it is inconsistent eating during workdays. Sometimes it is the gap between wanting better meals and having the energy to keep planning them. Naming the constraint clearly helps the rest of the plan feel relevant instead of generic.</p>
<p>Once the goal is defined, decision-making gets easier. The reader can evaluate meals based on fit, not just aspiration.</p>
<h2>Choose meals that are easy to repeat</h2>
<p>The best plans usually rely on a few repeatable patterns rather than constant novelty. That does not mean eating the same thing every day. It means having a dependable structure for lunch and dinner so the week does not start from zero every time.</p>
<p>Repeatable meals reduce decision fatigue. They also make it easier to keep quality high without spending the entire weekend planning, shopping, and prepping.</p>
<h2>Balance convenience with quality</h2>
<p>Convenience matters most when it supports consistency. A plan only works if it is easy enough to follow on the nights when work runs late or energy is low. That is why prepared meals can be useful: they preserve time without forcing the reader to settle for food that feels like an afterthought.</p>
<p>CookUnity should frame this as a practical advantage. The point is not just speed. The point is access to meals that still feel satisfying when life gets crowded.</p>
<h2>Plan for the days most likely to break the routine</h2>
<p>Every strong meal routine has weak points. Travel, late meetings, social plans, or fatigue after a long day will test the plan faster than the average Tuesday ever will. Articles that ignore this tend to feel unrealistic.</p>
<p>A stronger draft addresses those friction points directly. It shows the reader how to protect the routine even when the week stops behaving the way they expected.</p>
<h2>Use the close to move the reader forward</h2>
<p>Once the article has clarified the problem and offered a practical framework, the close should give the reader a clear next step. For blog content, that usually means a menu or email-capture bridge rather than a hard sell.</p>
<p>The transition works best when the article has already earned trust. If the advice feels concrete, the CTA will feel like a natural continuation instead of a jarring pivot.</p>
<h2>Bottom line</h2>
<p>A useful answer to ${row.keyword} should leave the reader with a clearer decision framework and an easier next step. That is the real job of the article, and it is where CookUnity can be differentiated without sounding generic.</p>
</article>`;
}

function buildLocalStepPayload(row: GridOpportunityRow, stepName: typeof orderedSteps[number]) {
  const title = titleizeKeyword(row.keyword);
  const slug = keywordToSlug(row.keyword);
  const reviewLabel = row.path === "blog" ? "Blog → email capture → nurture → trial" : "Landing page → direct trial";
  const outlinePackage = buildLocalOutlinePackage(row);

  switch (stepName) {
    case "discovery":
      return {
        keyword: row.keyword,
        path: row.path,
        intent: row.intent,
        message: `Discovered ${row.keyword} for the ${row.path === "blog" ? "capture" : "conversion"} workflow.`,
        relatedAngles: [
          `${row.keyword} for busy weekdays`,
          `${row.keyword} guide`,
          `best ${row.keyword}`,
        ],
      };
    case "prioritization":
      return {
        keyword: row.keyword,
        explanation: `Prioritized ${row.keyword} because it aligns with ${row.path === "blog" ? "top-of-funnel demand capture" : "high-intent conversion demand"} and is worth drafting immediately.`,
        reviewLabel,
      };
    case "brief":
      return {
        primaryKeyword: row.keyword,
        intentSummary: row.path === "blog"
          ? "Capture-first fallback brief for editorial review."
          : "Trial-first fallback landing page brief for editorial review.",
        reviewLabel,
        titleOptions: outlinePackage.titleOptions,
        selectedTitle: title,
        selectedSlug: slug,
        outlinePackage,
        briefJson: {
          outlinePackage,
          selectedTitle: title,
          selectedSlug: slug,
        },
      };
    case "draft":
      return {
        h1: title,
        slugRecommendation: slug,
        intro: row.path === "blog"
          ? `${title} is a strong capture topic for CookUnity and this fallback draft is written so the team can review real copy today.`
          : `${title} is a strong conversion topic for CookUnity and this fallback draft is written so the team can iterate on real landing page copy today.`,
        keyTakeaways: buildLocalKeyTakeaways(row),
        html: buildLocalDraftHtml(row, title),
        titleTagOptions: [`${title} | CookUnity`],
        metaDescriptionOptions: [
          row.path === "blog"
            ? `A practical CookUnity draft for ${row.keyword}, built for demand capture and editorial review.`
            : `A conversion-focused CookUnity draft for ${row.keyword}, built for landing page review.`,
        ],
      };
    case "qa":
      return {
        passed: true,
        requiresHumanReview: true,
        reviewLabel: row.path === "blog"
          ? "Review for email capture readiness"
          : "Review for trial conversion readiness",
        notes: [
          "Check brand tone before approval.",
          "Confirm CTA placement and internal links.",
          "Replace fallback examples with production proof points where available.",
        ],
      };
    default:
      return {
        message: "Publish is not available in local fallback mode.",
      };
  }
}

function buildLocalDetail(
  row: GridOpportunityRow,
  upToStep: typeof orderedSteps[number] = "qa",
  existingDetail?: GridOpportunityDetail,
): GridOpportunityDetail {
  const now = new Date().toISOString();
  const stepIndex = orderedSteps.indexOf(upToStep);
  const existingByStep = new Map((existingDetail?.steps ?? []).map((step) => [step.stepName, step]));
  const auditLog = existingDetail?.auditLog ?? [];
  const revisionNotes = existingDetail?.revisionNotes ?? [];
  const publishResults = existingDetail?.publishResults ?? [];

  const steps: GridStepView[] = orderedSteps.map((stepName, index) => {
    const current = existingByStep.get(stepName);
    if (index > stepIndex && stepName !== "publish") {
      return current && current.version > 0
        ? current
        : {
            id: row.steps.find((step) => step.stepName === stepName)?.id ?? `local_${row.id}_${stepName}`,
            stepName,
            status: "not_started" as const,
            version: 0,
          };
    }

    if (stepName === "publish") {
      return current && current.version > 0
        ? current
        : {
            id: row.steps.find((step) => step.stepName === stepName)?.id ?? `local_${row.id}_${stepName}`,
            stepName,
            status: "not_started" as const,
            version: 0,
          };
    }

    const rerun = current?.version && current.version > 0 && stepName === upToStep;
    const nextStep: GridStepView = {
      id: current?.id ?? row.steps.find((step) => step.stepName === stepName)?.id ?? `local_${row.id}_${stepName}`,
      stepName,
      status: stepName === "qa" && index === stepIndex ? "needs_review" : "completed",
      version: rerun ? current.version + 1 : Math.max(current?.version ?? 0, 1),
      startedAt: current?.startedAt ?? now,
      completedAt: now,
      output: current?.manualOutput ?? buildLocalStepPayload(row, stepName),
    };
    if (current?.manualOutput) nextStep.manualOutput = current.manualOutput;
    if (stepName === upToStep && current?.revisionNote) nextStep.revisionNote = current.revisionNote;
    if (current?.approvedAt) nextStep.approvedAt = current.approvedAt;
    if (current?.approvedBy) nextStep.approvedBy = current.approvedBy;
    return nextStep;
  });

  return {
    ...row,
    rowStatus: upToStep === "qa" ? "needs_review" : "running",
    updatedAt: now,
    steps,
    auditLog: [
      {
        id: `local_audit_${row.id}_${Date.now()}`,
        action: `local_${upToStep}_generated`,
        actorType: "system",
        createdAt: now,
      },
      ...auditLog,
    ],
    revisionNotes,
    publishResults,
  };
}

function isLocalStep(step: GridStepView) {
  return step.id.startsWith("local_") || step.id.startsWith("pending_") || step.id.startsWith("mock_");
}

const REVIEW_STORAGE_KEY = "cookunity-review-draft";

function getStepPayload(step: GridStepView) {
  return (step.manualOutput ?? step.output ?? null) as Record<string, unknown> | null;
}

function getBriefPackage(step: GridStepView): OutlinePackage | null {
  const payload = getStepPayload(step);
  if (!payload) return null;
  if ("outlinePackage" in payload && payload.outlinePackage && typeof payload.outlinePackage === "object") {
    return payload.outlinePackage as OutlinePackage;
  }
  if (
    "briefJson" in payload &&
    payload.briefJson &&
    typeof payload.briefJson === "object" &&
    "outlinePackage" in (payload.briefJson as Record<string, unknown>) &&
    (payload.briefJson as Record<string, unknown>).outlinePackage &&
    typeof (payload.briefJson as Record<string, unknown>).outlinePackage === "object"
  ) {
    return (payload.briefJson as Record<string, unknown>).outlinePackage as OutlinePackage;
  }
  return null;
}

function getDraftHtml(step: GridStepView) {
  const payload = getStepPayload(step);
  return typeof payload?.html === "string" ? payload.html : null;
}

function serializeBriefManualOutput(
  step: GridStepView,
  selectedTitle: string,
  selectedSlug: string,
  selectedSecondaryKeywords: KeywordOption[],
) {
  const payload = getStepPayload(step) ?? {};
  const briefJson =
    payload.briefJson && typeof payload.briefJson === "object"
      ? { ...(payload.briefJson as Record<string, unknown>) }
      : {};
  const existingPackage = getBriefPackage(step);
  const nextOutlinePackage: OutlinePackage = {
    primaryKeyword: existingPackage?.primaryKeyword ?? String(payload.primaryKeyword ?? ""),
    contentFormat: existingPackage?.contentFormat ?? "guide",
    keywordList: existingPackage?.keywordList ?? [],
    popularFoods: existingPackage?.popularFoods ?? [],
    serpResults: existingPackage?.serpResults ?? [],
    competitors: existingPackage?.competitors ?? [],
    competitorKeywordRollup: existingPackage?.competitorKeywordRollup ?? [],
    titleOptions: existingPackage?.titleOptions ?? [],
    selectedTitle,
    slugOptions: existingPackage?.slugOptions ?? [],
    selectedSlug,
    secondaryKeywordOptions: existingPackage?.secondaryKeywordOptions ?? [],
    selectedSecondaryKeywords,
    internalLinks: existingPackage?.internalLinks ?? [],
    mealRecommendations: existingPackage?.mealRecommendations ?? [],
    analysis: existingPackage?.analysis ?? {
      persona: "",
      searchIntent: "",
      competitorSummary: "",
      seoOpportunities: [],
      faqRecommendations: [],
      mealPlacementSuggestions: [],
      outline: [],
    },
    reviewState: {
      titleApproved: Boolean(selectedTitle),
      secondaryKeywordsApproved: selectedSecondaryKeywords.length > 0,
    },
  };

  return {
    ...payload,
    ...(selectedTitle ? { titleOptions: Array.isArray(payload.titleOptions) ? payload.titleOptions : nextOutlinePackage.titleOptions } : {}),
    ...(selectedTitle ? { primaryKeyword: nextOutlinePackage.primaryKeyword } : {}),
    secondaryKeywords: selectedSecondaryKeywords.map((item) => item.keyword),
    faqCandidates: nextOutlinePackage.analysis.faqRecommendations,
    recommendedInternalLinks: nextOutlinePackage.internalLinks.map((link, index) => ({
      targetId: `internal_link_${index + 1}`,
      targetUrl: link.url,
      anchorText: link.anchorText,
      rationale: `Supports ${link.label.toLowerCase()} placement in the outline package.`,
    })),
    briefJson: {
      ...briefJson,
      outlinePackage: nextOutlinePackage,
    },
  };
}

export function WorkflowGridControlPlane(props: {
  initialRows: GridOpportunityRow[];
  persistenceMode: "database" | "mock";
  databaseReady: boolean;
  workspaceKey: string;
  workspaceTitle: string;
  workspaceDescription: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<GridOpportunityRow[]>(props.initialRows);
  const [selectedId, setSelectedId] = useState<string | null>(props.initialRows[0]?.id ?? null);
  const [detail, setDetail] = useState<GridOpportunityDetail | null>(null);
  const [form, setForm] = useState({
    keyword: "",
    path: "blog",
    type: "keyword",
    pageIdea: "",
    competitorPageUrl: "",
  });
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [stepEdits, setStepEdits] = useState<Record<string, string>>({});
  const [briefTitleSelections, setBriefTitleSelections] = useState<Record<string, string>>({});
  const [briefSlugSelections, setBriefSlugSelections] = useState<Record<string, string>>({});
  const [briefSecondarySelections, setBriefSecondarySelections] = useState<Record<string, string[]>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowEdits, setRowEdits] = useState<Record<string, { keyword: string; path: "blog" | "landing_page"; type: "keyword" | "page_idea" | "competitor_page" | "lp_optimization" }>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(Boolean(props.initialRows[0]?.id));

  function mockStorageKey() {
    return `cookunity-grid:${props.workspaceKey}`;
  }

  function buildMockOpportunity(input: {
    keyword: string;
    path: OpportunityPath;
    type: OpportunityType;
    pageIdea?: string;
    competitorPageUrl?: string;
  }): GridOpportunityRow {
    const now = new Date().toISOString();
    const pathLabel = input.path === "blog" ? "capture" : "comparison";
    const reviewLabel = input.path === "blog" ? "Blog → email capture → nurture → trial" : "LP → direct trial";
    return {
      id: `mock_${props.workspaceKey}_${Date.now()}`,
      keyword: input.keyword,
      intent: pathLabel,
      path: input.path,
      type: input.type,
      rowStatus: "needs_review",
      ...(input.pageIdea ? { pageIdea: input.pageIdea } : {}),
      ...(input.competitorPageUrl ? { competitorPageUrl: input.competitorPageUrl } : {}),
      updatedAt: now,
      steps: [
        {
          id: `mock_discovery_${Date.now()}`,
          stepName: "discovery",
          status: "completed",
          version: 1,
          completedAt: now,
          output: { message: `${input.keyword} discovered in ${props.workspaceTitle.toLowerCase()}.` },
        },
        {
          id: `mock_prioritization_${Date.now()}`,
          stepName: "prioritization",
          status: "completed",
          version: 1,
          completedAt: now,
          output: { explanation: `Prioritized for the ${props.workspaceTitle.toLowerCase()} queue.` },
        },
        {
          id: `mock_brief_${Date.now()}`,
          stepName: "brief",
          status: "needs_review",
          version: 1,
          completedAt: now,
          output: { reviewLabel, summary: `Brief generated for ${input.keyword}.` },
        },
        {
          id: `mock_draft_${Date.now()}`,
          stepName: "draft",
          status: "not_started",
          version: 0,
        },
        {
          id: `mock_qa_${Date.now()}`,
          stepName: "qa",
          status: "not_started",
          version: 0,
        },
        {
          id: `mock_publish_${Date.now()}`,
          stepName: "publish",
          status: "not_started",
          version: 0,
        },
      ],
    };
  }

  function buildPendingRow(input: {
    keyword: string;
    path: OpportunityPath;
    type: OpportunityType;
    pageIdea?: string;
    competitorPageUrl?: string;
  }): GridOpportunityRow {
    const now = new Date().toISOString();
    return {
      id: `pending_${Date.now()}`,
      keyword: input.keyword,
      intent: input.path === "blog" ? "capture" : "comparison",
      path: input.path,
      type: input.type,
      rowStatus: "running",
      ...(input.pageIdea ? { pageIdea: input.pageIdea } : {}),
      ...(input.competitorPageUrl ? { competitorPageUrl: input.competitorPageUrl } : {}),
      updatedAt: now,
      steps: orderedSteps.map((stepName, index) => ({
        id: `pending_${stepName}_${Date.now()}_${index}`,
        stepName,
        status: index === 0 ? "running" : "not_started",
        version: 0,
        ...(index === 0 ? { startedAt: now } : {}),
      })),
    };
  }

  function saveMockRows(nextRows: GridOpportunityRow[]) {
    setRows(nextRows);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(mockStorageKey(), JSON.stringify(nextRows));
    }
  }

  function openReviewWorkspace(sourceDetail: GridOpportunityDetail) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(sourceDetail));
    window.location.href = `/review?opportunityId=${encodeURIComponent(sourceDetail.id)}`;
  }

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    if (!selectedId || props.persistenceMode !== "database") {
      setDetail(null);
      return;
    }
    void requestJson(`/api/opportunities/${selectedId}`)
      .then((payload) => {
        setDetail(payload.result ?? null);
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Failed to load detail.");
      });
  }, [selectedId, props.persistenceMode]);

  useEffect(() => {
    if (props.persistenceMode === "database") {
      setRows(props.initialRows);
      return;
    }

    if (typeof window === "undefined") {
      setRows(props.initialRows);
      return;
    }

    const saved = window.localStorage.getItem(mockStorageKey());
    if (!saved) {
      setRows(props.initialRows);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as GridOpportunityRow[];
      setRows(parsed);
    } catch {
      setRows(props.initialRows);
    }
  }, [props.initialRows, props.persistenceMode, props.workspaceKey]);

  useEffect(() => {
    if (selectedId) {
      setDrawerOpen(true);
    }
  }, [selectedId]);

  async function refreshRow(opportunityId: string) {
    if (props.persistenceMode !== "database") return;
    const payload = await requestJson(`/api/opportunities/${opportunityId}`);
    const nextDetail = payload.result ?? null;
    if (!nextDetail) return;
    setDetail(nextDetail);
    setRows((current) => applyDetailToRows(current, nextDetail));
  }

  async function runWorkflowInline(opportunityId: string) {
    if (props.persistenceMode !== "database") return;
    const payload = await requestJson(`/api/opportunities/${opportunityId}/run`, {
      method: "POST",
    });
    const nextDetail = payload.result ?? null;
    if (!nextDetail) {
      await refreshRow(opportunityId);
      return;
    }
    setDetail(nextDetail);
    setRows((current) => applyDetailToRows(current, nextDetail));
    setSelectedId(opportunityId);
    setDrawerOpen(true);
  }

  async function generateDraftForSelected(opportunityId: string) {
    const targetRow = rows.find((row) => row.id === opportunityId) ?? selectedRow;
    const isDirectLocalFallback =
      props.persistenceMode !== "database" ||
      !props.databaseReady ||
      Boolean(targetRow?.id.startsWith("pending_")) ||
      Boolean(targetRow?.steps.some((step) => isLocalStep(step)));
    if (isDirectLocalFallback && targetRow) {
      const localDetail = buildLocalDetail(targetRow, "qa", detail?.id === targetRow.id ? detail : undefined);
      setLocalDetail(localDetail);
      setNotice("Draft generated locally from fallback copy.");
      setError(null);
      return;
    }
    try {
      await runWorkflowInline(opportunityId);
      await refreshRow(opportunityId);
      setNotice("Draft generated.");
    } catch (nextError) {
      if (!targetRow) {
        throw nextError;
      }
      const localDetail = buildLocalDetail(targetRow, "qa", detail?.id === targetRow.id ? detail : undefined);
      setDetail(localDetail);
      setRows((current) => applyDetailToRows(current, localDetail));
      setSelectedId(localDetail.id);
      setDrawerOpen(true);
      setNotice("Draft generated locally from fallback copy.");
      setError(null);
    }
  }

  function beginRowEdit(row: GridOpportunityRow) {
    setEditingRowId(row.id);
    setRowEdits((current) => ({
      ...current,
      [row.id]: {
        keyword: row.keyword,
        path: row.path,
        type: row.type,
      },
    }));
  }

  async function saveRowEdit(rowId: string) {
    const draft = rowEdits[rowId];
    if (!draft) return;
    if (props.persistenceMode !== "database") {
      const nextRows = rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              keyword: draft.keyword,
              path: draft.path,
              type: draft.type,
              intent: draft.path === "blog" ? "capture" : "comparison",
              updatedAt: new Date().toISOString(),
            }
          : row,
      );
      saveMockRows(nextRows);
      setEditingRowId(null);
      return;
    }
    await requestJson(`/api/opportunities/${rowId}`, {
      method: "PATCH",
      body: JSON.stringify(draft),
    });
    setEditingRowId(null);
    await refreshRow(rowId);
    router.refresh();
  }

  function runAction(action: () => Promise<void>) {
    setError(null);
    setNotice(null);
    startTransition(() => {
      void action().catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Action failed.");
      });
    });
  }

  const currentSteps = detail?.steps ?? selectedRow?.steps ?? [];
  const isLocalWorkflow =
    props.persistenceMode !== "database" ||
    !props.databaseReady ||
    Boolean(selectedRow?.id.startsWith("pending_")) ||
    currentSteps.some((step) => isLocalStep(step));

  function setLocalDetail(nextDetail: GridOpportunityDetail) {
    setDetail(nextDetail);
    setRows((current) => applyDetailToRows(current, nextDetail));
    setSelectedId(nextDetail.id);
    setDrawerOpen(true);
  }

  function updateLocalDetail(mutator: (current: GridOpportunityDetail) => GridOpportunityDetail) {
    const baseDetail = detail ?? (selectedRow ? buildLocalDetail(selectedRow) : null);
    if (!baseDetail) return;
    setLocalDetail(mutator(baseDetail));
  }

  useEffect(() => {
    if (props.persistenceMode !== "database") return;
    if (!selectedId) return;
    if (!drawerOpen) return;
    const hasRunningStep = currentSteps.some((step) => step.status === "running");
    if (!hasRunningStep) return;

    const intervalId = window.setInterval(() => {
      void refreshRow(selectedId).catch(() => {
        // Let existing request handlers surface actionable errors.
      });
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [currentSteps, drawerOpen, props.persistenceMode, selectedId]);

  return (
    <div className="airops-grid-layout">
      <div className="air-sheet">
        <div className="air-sheet-meta">
          <div className="air-sheet-meta-left">
            <div className="air-sheet-name">{props.workspaceTitle}</div>
            <div className="air-sheet-context">{props.workspaceDescription}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge variant="grid">{props.persistenceMode === "database" ? "Database-backed" : "Mock fallback"}</Badge>
            <Badge variant="grid">{props.databaseReady ? "DB connected" : "DB unavailable"}</Badge>
            <Badge variant="grid">{pending ? "Running action" : "Ready"}</Badge>
          </div>
        </div>
        {error ? (
          <div className="air-banner-error">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div
            style={{
              padding: "10px 12px",
              border: "1px solid #d9e6d8",
              background: "#f4fbf3",
              color: "#245135",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {notice}
          </div>
        ) : null}

        <div
          className="air-sheet-form"
          style={{ marginBottom: 12 }}
        >
            <label className="air-sheet-label">
              <span>Opportunity / keyword</span>
              <input
                className="air-input"
                value={form.keyword}
                onChange={(event) => setForm((current) => ({ ...current, keyword: event.target.value }))}
                placeholder="best vegetarian meal delivery"
              />
            </label>
            <label className="air-sheet-label">
              <span>Path</span>
              <select
                className="air-select"
                value={form.path}
                onChange={(event) => setForm((current) => ({ ...current, path: event.target.value }))}
              >
                <option value="blog">Blog</option>
                <option value="landing_page">Landing page</option>
              </select>
            </label>
            <label className="air-sheet-label">
              <span>Type</span>
              <select
                className="air-select"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="keyword">Keyword</option>
                <option value="page_idea">Page idea</option>
                <option value="competitor_page">Competitor page</option>
                <option value="lp_optimization">LP optimization</option>
              </select>
            </label>
            <label className="air-sheet-label">
              <span>Page idea</span>
              <input
                className="air-input"
                value={form.pageIdea}
                onChange={(event) => setForm((current) => ({ ...current, pageIdea: event.target.value }))}
                placeholder="Optional framing"
              />
            </label>
            <label className="air-sheet-label">
              <span>Competitor page</span>
              <input
                className="air-input"
                value={form.competitorPageUrl}
                onChange={(event) => setForm((current) => ({ ...current, competitorPageUrl: event.target.value }))}
                placeholder="Optional URL"
              />
            </label>
            <button
              type="button"
              disabled={pending || !form.keyword.trim()}
              onClick={() =>
                runAction(async () => {
                  const payload = {
                    keyword: form.keyword.trim(),
                    path: form.path as OpportunityPath,
                    type: form.type as OpportunityType,
                    ...(form.pageIdea ? { pageIdea: form.pageIdea } : {}),
                    ...(form.competitorPageUrl ? { competitorPageUrl: form.competitorPageUrl } : {}),
                  };
                  if (props.persistenceMode === "database") {
                    const optimisticRow = buildPendingRow(payload);
                    setRows((current) => [optimisticRow, ...current]);
                    setSelectedId(optimisticRow.id);
                    setDrawerOpen(true);

                    try {
                      const response = await requestJson("/api/opportunities", {
                        method: "POST",
                        body: JSON.stringify(payload),
                      });
                      const createdDetail = response.result ?? null;
                      if (createdDetail) {
                        setRows((current) => applyDetailToRows(current.filter((row) => row.id !== optimisticRow.id), createdDetail));
                        setDetail(createdDetail);
                        setSelectedId(createdDetail.id);
                        setDrawerOpen(true);
                        await refreshRow(createdDetail.id);
                        setNotice("Opportunity created and workflow artifacts generated.");
                      } else {
                        setRows((current) => current.filter((row) => row.id !== optimisticRow.id));
                        router.refresh();
                        setNotice("Opportunity created.");
                      }
                    } catch (nextError) {
                      const localDetail = buildLocalDetail(optimisticRow);
                      setLocalDetail(localDetail);
                      setNotice("Opportunity created with local fallback draft.");
                      setError(null);
                    }
                  } else {
                    const created = buildMockOpportunity(payload);
                    const nextRows = [created, ...rows];
                    saveMockRows(nextRows);
                    setSelectedId(created.id);
                    setDrawerOpen(true);
                    setNotice("Opportunity created in mock mode.");
                  }
                  setForm({
                    keyword: "",
                    path: "blog",
                    type: "keyword",
                    pageIdea: "",
                    competitorPageUrl: "",
                  });
                  if (props.persistenceMode === "database") {
                    router.refresh();
                  }
                })
              }
            >
              Create and run
            </button>
        </div>

        <div className="air-table-wrap">
          <table className="air-table">
              <thead>
                <tr>
                  {[
                    "Opportunity / Keyword",
                    "Intent",
                    "Path",
                    "Discovery",
                    "Prioritization",
                    "Brief",
                    "Draft",
                    "QA",
                    "Publish",
                    "Actions",
                  ].map((label) => (
                    <th key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => {
                      setSelectedId(row.id);
                      setDrawerOpen(true);
                    }}
                    className={row.id === selectedId ? "is-selected" : undefined}
                    style={{ cursor: "pointer" }}
                  >
                    <td
                      className="air-cell-keyword air-sticky-col"
                      style={{ background: row.id === selectedId ? "#f8fbff" : rowTone(row.rowStatus) }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        beginRowEdit(row);
                      }}
                    >
                      {editingRowId === row.id ? (
                        <div className="air-inline-editor">
                          <input
                            className="air-input"
                            value={rowEdits[row.id]?.keyword ?? row.keyword}
                            onChange={(event) =>
                              setRowEdits((current) => ({
                                ...current,
                                [row.id]: { ...(current[row.id] ?? { keyword: row.keyword, path: row.path, type: row.type }), keyword: event.target.value },
                              }))
                            }
                          />
                          <div className="air-inline-actions">
                            <button className="air-mini-button" type="button" onClick={(event) => { event.stopPropagation(); void runAction(async () => saveRowEdit(row.id)); }}>
                              Save
                            </button>
                            <button className="air-mini-button" type="button" onClick={(event) => { event.stopPropagation(); setEditingRowId(null); }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 800 }}>{row.keyword}</div>
                          <div style={{ fontSize: 12, color: "#627267", marginTop: 6 }}>{row.type.replaceAll("_", " ")}</div>
                        </>
                      )}
                    </td>
                    <td className="air-sticky-col-2" style={{ background: row.id === selectedId ? "#f8fbff" : rowTone(row.rowStatus) }}>
                      {editingRowId === row.id ? (
                        <select
                          className="air-select"
                          value={rowEdits[row.id]?.path ?? row.path}
                          onChange={(event) =>
                            setRowEdits((current) => ({
                              ...current,
                              [row.id]: {
                                ...(current[row.id] ?? { keyword: row.keyword, path: row.path, type: row.type }),
                                path: event.target.value as "blog" | "landing_page",
                              },
                            }))
                          }
                          onClick={(event) => event.stopPropagation()}
                        >
                          <option value="blog">Blog</option>
                          <option value="landing_page">Landing page</option>
                        </select>
                      ) : (
                        row.intent
                      )}
                    </td>
                    <td>
                      {editingRowId === row.id ? (
                        <select
                          className="air-select"
                          value={rowEdits[row.id]?.type ?? row.type}
                          onChange={(event) =>
                            setRowEdits((current) => ({
                              ...current,
                              [row.id]: {
                                ...(current[row.id] ?? { keyword: row.keyword, path: row.path, type: row.type }),
                                type: event.target.value as "keyword" | "page_idea" | "competitor_page" | "lp_optimization",
                              },
                            }))
                          }
                          onClick={(event) => event.stopPropagation()}
                        >
                          <option value="keyword">Keyword</option>
                          <option value="page_idea">Page idea</option>
                          <option value="competitor_page">Competitor page</option>
                          <option value="lp_optimization">LP optimization</option>
                        </select>
                      ) : (
                        <Badge variant="grid">{row.path === "blog" ? "Blog → capture" : "LP → direct trial"}</Badge>
                      )}
                    </td>
                    {orderedSteps.map((stepName) => {
                      const step = row.steps.find((item) => item.stepName === stepName);
                      const tone = cellTone(step?.status ?? "not_started");
                      const actionLabel = stepActionLabel(step);
                      const preview = stepPreview(step);
                      return (
                        <td
                          key={`${row.id}_${stepName}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(row.id);
                            setDrawerOpen(true);
                          }}
                        >
                          <div className="air-step-cell">
                            <div className="air-step-statusline">
                              <span className="air-step-dot" style={{ background: tone.color }} />
                              <span className="air-step-action" style={{ color: stepActionTone(step) }}>{actionLabel}</span>
                            </div>
                            <div className="air-step-preview">{preview || stepName}</div>
                            <div className="air-step-hover-actions">
                              <button
                                className="air-chip-button"
                                type="button"
                                disabled={pending}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedId(row.id);
                                  setDrawerOpen(true);
                                }}
                              >
                                Open
                              </button>
                              <button
                                className="air-chip-button"
                                type="button"
                                disabled={pending}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  runAction(async () => {
                                    if (
                                      props.persistenceMode !== "database" ||
                                      !props.databaseReady ||
                                      row.id.startsWith("pending_") ||
                                      row.steps.some((item) => isLocalStep(item))
                                    ) {
                                      const existingDetail = detail?.id === row.id ? detail : undefined;
                                      const localDetail = buildLocalDetail(row, stepName, existingDetail);
                                      setLocalDetail(localDetail);
                                      setNotice(`${stepName} completed in local fallback mode.`);
                                      setSelectedId(row.id);
                                      setDrawerOpen(true);
                                      return;
                                    }
                                    if (!step || step.version === 0 || step.status === "not_started") {
                                      await requestJson(`/api/opportunities/${row.id}/steps/${stepName}/run`, { method: "POST" });
                                    } else {
                                      await requestJson(`/api/workflow/steps/${step.id}/rerun`, { method: "POST" });
                                    }
                                    await refreshRow(row.id);
                                    router.refresh();
                                  });
                                }}
                              >
                                {step && step.version > 0 ? "Rerun" : "Run"}
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td>
                      <div className="air-actions">
                        <button
                          className="air-mini-button"
                          type="button"
                          disabled={pending}
                          onClick={(event) => {
                            event.stopPropagation();
                            runAction(async () => {
                              await generateDraftForSelected(row.id);
                              if (props.persistenceMode === "database") {
                                router.refresh();
                              }
                            });
                          }}
                        >
                          Generate draft
                        </button>
                        <button
                          className="air-mini-button"
                          type="button"
                          disabled={pending}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(row.id);
                            setDrawerOpen(true);
                          }}
                        >
                          Open
                        </button>
                        <button
                          className="air-mini-button"
                          type="button"
                          disabled={pending || (props.persistenceMode === "database" ? row.rowStatus !== "approved" : false)}
                          onClick={(event) => {
                            event.stopPropagation();
                            runAction(async () => {
                              if (props.persistenceMode !== "database") {
                                const nextRows = rows.map((item) =>
                                  item.id === row.id ? { ...item, rowStatus: "published" as const } : item,
                                );
                                saveMockRows(nextRows);
                                return;
                              }
                              await requestJson(`/api/opportunities/${row.id}/publish`, { method: "POST" });
                              await refreshRow(row.id);
                              router.refresh();
                            });
                          }}
                        >
                          Publish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      <div className={`air-drawer-scrim ${drawerOpen ? "is-open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`air-drawer ${drawerOpen ? "is-open" : ""}`}>
        <div className="air-drawer-panel">
          {selectedRow ? (
            <div className="air-drawer-head">
              <div>
                <div className="air-drawer-title">{selectedRow.keyword}</div>
                <div className="air-drawer-subtitle">{selectedRow.path === "blog" ? "Blog capture workflow" : "Landing page conversion workflow"}</div>
              </div>
              <button type="button" className="air-drawer-close" onClick={() => setDrawerOpen(false)}>
                ×
              </button>
            </div>
          ) : null}
          {!selectedRow ? (
            <p style={{ marginTop: 0, marginBottom: 0 }}>Pick a row to review outputs, revisions, and audit history.</p>
          ) : (
            <div className="air-pane-grid">
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Badge variant="grid">{selectedRow.intent}</Badge>
                  <Badge variant="grid">{selectedRow.rowStatus}</Badge>
                  {selectedRow.searchVolume ? <Badge variant="grid">{`${selectedRow.searchVolume.toLocaleString()} volume`}</Badge> : null}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      runAction(async () => {
                        await generateDraftForSelected(selectedRow.id);
                        if (props.persistenceMode === "database") {
                          router.refresh();
                        }
                      })
                    }
                  >
                    Generate draft now
                  </button>
                  <button
                    type="button"
                    disabled={!detail && !selectedRow}
                    onClick={() => {
                      const reviewDetail = detail ?? buildLocalDetail(selectedRow);
                      openReviewWorkspace(reviewDetail);
                    }}
                  >
                    Open review page
                  </button>
                </div>
              </div>

              {(() => {
                const draftStep = currentSteps.find((step) => step.stepName === "draft");
                const draftHtml = draftStep ? getDraftHtml(draftStep) : null;
                if (!draftHtml) return null;
                return (
                  <div className="air-drawer-section">
                    <div className="air-drawer-section-title">Draft preview</div>
                    <div
                      style={{
                        border: "1px solid #e2d7c7",
                        borderRadius: 10,
                        padding: 12,
                        background: "#fff",
                        maxHeight: 320,
                        overflowY: "auto",
                      }}
                      dangerouslySetInnerHTML={{ __html: draftHtml }}
                    />
                  </div>
                );
              })()}

              {currentSteps.map((step) => (
                <div key={step.id} className="air-section-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{step.stepName}</div>
                        <div style={{ fontSize: 13, color: "#58685d", marginTop: 4 }}>
                          Version {step.version} {step.completedAt ? `• ${new Date(step.completedAt).toLocaleString()}` : ""}
                        </div>
                      </div>
                    <Badge variant="grid">{step.status}</Badge>
                  </div>

                  {step.error ? (
                    <div style={{ marginTop: 10, color: "#8b1c1c", fontWeight: 700 }}>{step.error}</div>
                  ) : null}

                  {step.output ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Output</div>
                      {step.stepName === "brief" && getBriefPackage(step) ? (
                        (() => {
                          const outlinePackage = getBriefPackage(step)!;
                          const selectedTitle = briefTitleSelections[step.id] ?? outlinePackage.selectedTitle ?? outlinePackage.titleOptions[0] ?? "";
                          const selectedSlug = briefSlugSelections[step.id] ?? outlinePackage.selectedSlug ?? outlinePackage.slugOptions[0] ?? "";
                          const selectedSecondaryKeywords =
                            briefSecondarySelections[step.id] ?? outlinePackage.selectedSecondaryKeywords.map((item) => item.keyword);

                          return (
                            <div style={{ display: "grid", gap: 12 }}>
                              <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                                <div style={{ fontWeight: 700 }}>Keyword overview</div>
                                <div style={{ fontSize: 13 }}>
                                  Search volume: {outlinePackage.keywordOverview?.searchVolume?.toLocaleString?.() ?? "n/a"}
                                </div>
                                {outlinePackage.keywordOverview?.keywordDifficulty !== undefined ? (
                                  <div style={{ fontSize: 13, color: "#58685d" }}>
                                    Keyword difficulty: {outlinePackage.keywordOverview.keywordDifficulty}
                                  </div>
                                ) : null}
                              </div>

                              <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                                <div style={{ fontWeight: 700 }}>Main internal link</div>
                                {outlinePackage.mainInternalLink?.link ? (
                                  <div style={{ fontSize: 13 }}>
                                    <strong>{outlinePackage.mainInternalLink.keyword}</strong>
                                    <div style={{ color: "#58685d", wordBreak: "break-all" }}>{outlinePackage.mainInternalLink.link}</div>
                                  </div>
                                ) : (
                                  <p style={{ margin: 0 }}>No strong main internal link match found.</p>
                                )}
                              </div>

                              <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                                <div style={{ fontWeight: 700 }}>Title selection</div>
                                {outlinePackage.titleOptions.map((title) => (
                                  <label key={title} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                    <input
                                      type="radio"
                                      name={`title_${step.id}`}
                                      checked={selectedTitle === title}
                                      onChange={() => setBriefTitleSelections((current) => ({ ...current, [step.id]: title }))}
                                    />
                                    <span>{title}</span>
                                  </label>
                                ))}
                              </div>

                              {outlinePackage.slugOptions.length ? (
                                <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                                  <div style={{ fontWeight: 700 }}>Slug selection</div>
                                  {outlinePackage.slugOptions.map((slug) => (
                                    <label key={slug} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                      <input
                                        type="radio"
                                        name={`slug_${step.id}`}
                                        checked={selectedSlug === slug}
                                        onChange={() => setBriefSlugSelections((current) => ({ ...current, [step.id]: slug }))}
                                      />
                                      <span>{slug}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : null}

                              <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                                <div style={{ fontWeight: 700 }}>Secondary keyword selection</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <Badge variant="grid">{`Top ${outlinePackage.secondaryKeywordOptions.length} fetched`}</Badge>
                                  <Badge variant="grid">
                                    {outlinePackage.keywordOverview ? "Semrush-backed keyword set" : "Keyword set"}
                                  </Badge>
                                </div>
                                <div style={{ display: "grid", gap: 6 }}>
                                  {outlinePackage.secondaryKeywordOptions.map((item) => (
                                    <div
                                      key={`chip_${item.keyword}`}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 12,
                                        alignItems: "center",
                                        fontSize: 13,
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        background: "#f8f3ea",
                                        border: "1px solid #eadfce",
                                      }}
                                    >
                                      <span style={{ fontWeight: 600 }}>{item.keyword}</span>
                                      <span
                                        style={{
                                          whiteSpace: "nowrap",
                                          fontSize: 12,
                                          fontWeight: 800,
                                          color: "#58685d",
                                        }}
                                      >
                                        {item.searchVolume.toLocaleString()} / mo
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {outlinePackage.secondaryKeywordOptions.slice(0, 20).map((item) => {
                                  const checked = selectedSecondaryKeywords.includes(item.keyword);
                                  return (
                                    <label key={item.keyword} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                          setBriefSecondarySelections((current) => {
                                            const currentValues = current[step.id] ?? outlinePackage.selectedSecondaryKeywords.map((entry) => entry.keyword);
                                            const nextValues = checked
                                              ? currentValues.filter((value) => value !== item.keyword)
                                              : [...currentValues, item.keyword];
                                            return { ...current, [step.id]: nextValues };
                                          })
                                        }
                                      />
                                      <span>{item.keyword} • {item.searchVolume.toLocaleString()}</span>
                                    </label>
                                  );
                                })}
                              </div>

                              <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                                <div style={{ fontWeight: 700 }}>Competitor summary</div>
                                <p style={{ margin: 0, lineHeight: 1.6 }}>{outlinePackage.analysis.competitorSummary}</p>
                                <div style={{ display: "grid", gap: 6 }}>
                                  {outlinePackage.competitors.map((competitor) => (
                                    <div key={competitor.url} style={{ fontSize: 13 }}>
                                      <strong>{competitor.title}</strong>
                                      <div style={{ color: "#58685d" }}>{competitor.url}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                                <div style={{ fontWeight: 700 }}>Meal recommendations</div>
                                {outlinePackage.mealRecommendations.length ? outlinePackage.mealRecommendations.map((meal) => (
                                  <div key={meal.id} style={{ fontSize: 13 }}>
                                    <strong>{meal.name}</strong>
                                    <div style={{ color: "#58685d" }}>{meal.reason}</div>
                                  </div>
                                )) : <p style={{ margin: 0 }}>No meal recommendations yet.</p>}
                              </div>

                              <div style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                                <div style={{ fontWeight: 700 }}>Outline</div>
                                {outlinePackage.analysis.outline.map((item, index) => (
                                  <div key={`${item.heading}_${index}`} style={{ fontSize: 13 }}>
                                    <strong>{`H${item.level} • ${item.heading}`}</strong>
                                    <div style={{ color: "#58685d" }}>{item.notes}</div>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                disabled={pending || props.persistenceMode !== "database"}
                                onClick={() =>
                                  runAction(async () => {
                                    const selectedKeywordObjects = outlinePackage.secondaryKeywordOptions.filter((item) =>
                                      selectedSecondaryKeywords.includes(item.keyword),
                                    );
                                    const manualOutput = serializeBriefManualOutput(
                                      step,
                                      selectedTitle,
                                      selectedSlug,
                                      selectedKeywordObjects,
                                    );
                                    await requestJson(`/api/workflow/steps/${step.id}/edit`, {
                                      method: "POST",
                                      body: JSON.stringify({ manualOutput }),
                                    });
                                    await refreshRow(selectedRow.id);
                                  })
                                }
                              >
                                Save brief selections
                              </button>
                            </div>
                          );
                        })()
                      ) : getDraftHtml(step) ? (
                        <div
                          style={{
                            border: "1px solid #e2d7c7",
                            borderRadius: 10,
                            padding: 12,
                            background: "#fff",
                            maxHeight: 280,
                            overflowY: "auto",
                          }}
                          dangerouslySetInnerHTML={{ __html: String(getDraftHtml(step)) }}
                        />
                      ) : (
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            fontSize: 12,
                            lineHeight: 1.6,
                            background: "#fff",
                            border: "1px solid #e2d7c7",
                            borderRadius: 10,
                            padding: 12,
                            maxHeight: 260,
                            overflowY: "auto",
                          }}
                        >
                          {JSON.stringify(step.manualOutput ?? step.output, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <textarea
                      className="air-textarea"
                      value={stepNotes[step.id] ?? ""}
                      onChange={(event) => setStepNotes((current) => ({ ...current, [step.id]: event.target.value }))}
                      placeholder="Revision note or rerun context"
                    />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={pending || step.version === 0}
                        onClick={() =>
                          runAction(async () => {
                            if (isLocalWorkflow || isLocalStep(step)) {
                              updateLocalDetail((current) => {
                                const nextSteps = current.steps.map((item) =>
                                  item.id === step.id
                                    ? {
                                        ...item,
                                        status: "approved" as const,
                                        approvedBy: "reviewer@cookunity.local",
                                        approvedAt: new Date().toISOString(),
                                        completedAt: item.completedAt ?? new Date().toISOString(),
                                      }
                                    : item,
                                );
                                const qaApproved = nextSteps.find((item) => item.stepName === "qa")?.status === "approved";
                                return {
                                  ...current,
                                  steps: nextSteps,
                                  rowStatus: qaApproved ? "approved" : current.rowStatus,
                                };
                              });
                              setNotice(step.stepName === "qa" ? "Review approved." : `${step.stepName} approved.`);
                              return;
                            }
                            await requestJson(`/api/workflow/steps/${step.id}/approve`, { method: "POST" });
                            await refreshRow(selectedRow.id);
                            router.refresh();
                          })
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pending || step.version === 0}
                        onClick={() =>
                          runAction(async () => {
                            if (isLocalWorkflow || isLocalStep(step)) {
                              updateLocalDetail((current) => ({
                                ...current,
                                rowStatus: "blocked",
                                steps: current.steps.map((item) =>
                                  item.id === step.id
                                    ? {
                                        ...item,
                                        status: "needs_review" as const,
                                        ...(stepNotes[step.id] ? { revisionNote: stepNotes[step.id] } : {}),
                                      }
                                    : item,
                                ),
                                revisionNotes: [
                                  {
                                    id: `local_revision_${Date.now()}`,
                                    note: stepNotes[step.id] || "Revision requested.",
                                    requestedBy: "reviewer@cookunity.local",
                                    createdAt: new Date().toISOString(),
                                  },
                                  ...current.revisionNotes,
                                ],
                              }));
                              setNotice("Revision request saved.");
                              return;
                            }
                            await requestJson(`/api/workflow/steps/${step.id}/revision`, {
                              method: "POST",
                              body: JSON.stringify({ note: stepNotes[step.id] }),
                            });
                            await refreshRow(selectedRow.id);
                            router.refresh();
                          })
                        }
                      >
                        Request revision
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          runAction(async () => {
                            if (isLocalWorkflow || isLocalStep(step)) {
                              const localDetail = buildLocalDetail(selectedRow, step.stepName, detail ?? undefined);
                              setLocalDetail(localDetail);
                              setNotice(
                                step.stepName === "qa"
                                  ? "QA package generated in local fallback mode."
                                  : `${step.stepName} completed in local fallback mode.`,
                              );
                              return;
                            }
                            if (step.version === 0) {
                              await requestJson(`/api/opportunities/${selectedRow.id}/steps/${step.stepName}/run`, {
                                method: "POST",
                              });
                            } else {
                              await requestJson(`/api/workflow/steps/${step.id}/rerun`, {
                                method: "POST",
                                body: JSON.stringify({ note: stepNotes[step.id] }),
                              });
                            }
                            await refreshRow(selectedRow.id);
                            router.refresh();
                          })
                        }
                      >
                        {step.version === 0 ? "Run step" : "Rerun step"}
                      </button>
                    </div>
                  </div>

                  {step.stepName === "draft" || step.stepName === "brief" ? (
                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                      <textarea
                        className="air-textarea"
                        value={
                          stepEdits[step.id] ??
                          JSON.stringify(getStepPayload(step) ?? {}, null, 2)
                        }
                        onChange={(event) => setStepEdits((current) => ({ ...current, [step.id]: event.target.value }))}
                        placeholder="Manual edit JSON"
                        style={{ minHeight: 160, fontFamily: "monospace" }}
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          runAction(async () => {
                            const manualOutput = JSON.parse(stepEdits[step.id] ?? "{}") as unknown;
                            if (isLocalWorkflow || isLocalStep(step)) {
                              updateLocalDetail((current) => ({
                                ...current,
                                steps: current.steps.map((item) =>
                                  item.id === step.id
                                    ? {
                                        ...item,
                                        manualOutput: manualOutput as Record<string, unknown>,
                                        completedAt: new Date().toISOString(),
                                        status: item.stepName === "qa" ? item.status : "needs_review",
                                      }
                                    : item,
                                ),
                              }));
                              setNotice("Manual edit saved locally.");
                              return;
                            }
                            await requestJson(`/api/workflow/steps/${step.id}/edit`, {
                              method: "POST",
                              body: JSON.stringify({ manualOutput }),
                            });
                            await refreshRow(selectedRow.id);
                          })
                        }
                      >
                        Save manual edit
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}

              <div className="air-drawer-section">
                <div className="air-drawer-section-title">Audit trail</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(detail?.auditLog ?? []).map((entry) => (
                    <div key={entry.id} style={{ borderTop: "1px solid #eadfce", paddingTop: 10 }}>
                      <div style={{ fontWeight: 700 }}>{entry.action}</div>
                      <div style={{ fontSize: 13, color: "#58685d" }}>
                        {entry.actorType}
                        {entry.actorId ? ` • ${entry.actorId}` : ""} • {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {!(detail?.auditLog ?? []).length ? <p style={{ margin: 0 }}>No audit events yet.</p> : null}
                </div>
              </div>

              <div className="air-drawer-section">
                <div className="air-drawer-section-title">Revision history</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {(detail?.revisionNotes ?? []).map((entry) => (
                    <div key={entry.id} style={{ borderTop: "1px solid #eadfce", paddingTop: 10 }}>
                      <div>{entry.note}</div>
                      <div style={{ fontSize: 13, color: "#58685d" }}>
                        {entry.requestedBy} • {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {!(detail?.revisionNotes ?? []).length ? <p style={{ margin: 0 }}>No revision notes yet.</p> : null}
                </div>
              </div>

              <div className="air-drawer-section">
                <div className="air-drawer-section-title">Version history</div>
                <p style={{ marginTop: 0, marginBottom: 0 }}>
                  Version history is now captured per step run. The drawer currently shows the latest version only; deeper diff views are the next milestone.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
