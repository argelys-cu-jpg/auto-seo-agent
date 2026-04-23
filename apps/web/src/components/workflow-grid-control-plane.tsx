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
                      setRows((current) => current.filter((row) => row.id !== optimisticRow.id));
                      throw nextError;
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
                                    if (props.persistenceMode !== "database") {
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
                              if (props.persistenceMode !== "database") {
                                setSelectedId(row.id);
                                setDrawerOpen(true);
                                return;
                              }
                              await runWorkflowInline(row.id);
                              router.refresh();
                            });
                          }}
                        >
                          Run workflow
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
              </div>

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
                        disabled={pending || props.persistenceMode !== "database" || step.version === 0}
                        onClick={() =>
                          runAction(async () => {
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
                        disabled={pending || props.persistenceMode !== "database" || step.version === 0}
                        onClick={() =>
                          runAction(async () => {
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
                        disabled={pending || props.persistenceMode !== "database"}
                        onClick={() =>
                          runAction(async () => {
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
                        disabled={pending || props.persistenceMode !== "database"}
                        onClick={() =>
                          runAction(async () => {
                            const manualOutput = JSON.parse(stepEdits[step.id] ?? "{}") as unknown;
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
