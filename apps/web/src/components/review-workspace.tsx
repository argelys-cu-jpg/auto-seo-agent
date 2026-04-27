"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageShell } from "./page-shell";
import type { GridOpportunityDetail, GridStepView } from "../lib/workflow-grid-store";

const REVIEW_STORAGE_KEY = "cookunity-review-draft";

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as { success: boolean; message?: string; result?: GridOpportunityDetail }) : null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? raw ?? "Request failed.");
  }
  return payload;
}

function getStepPayload(step?: GridStepView | null) {
  if (!step) return null;
  return (step.manualOutput ?? step.output ?? null) as Record<string, unknown> | null;
}

function getDraftStep(detail: GridOpportunityDetail | null) {
  return detail?.steps.find((step) => step.stepName === "draft") ?? null;
}

function getBriefStep(detail: GridOpportunityDetail | null) {
  return detail?.steps.find((step) => step.stepName === "brief") ?? null;
}

function stringifyList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function draftPreviewHtml(draftPayload: Record<string, unknown> | null, fallbackTitle: string) {
  if (typeof draftPayload?.html === "string" && draftPayload.html.trim()) {
    return draftPayload.html;
  }

  const intro = typeof draftPayload?.intro === "string" ? draftPayload.intro : "";
  const sections = Array.isArray(draftPayload?.sections) ? draftPayload.sections : [];

  return [
    `<h1>${fallbackTitle}</h1>`,
    intro ? `<p>${intro}</p>` : "",
    ...sections.map((section) => {
      const item = section as Record<string, unknown>;
      const heading = String(item.heading ?? "");
      const body = String(item.body ?? "");
      const level = Number(item.level ?? 2);
      return `<h${level}>${heading}</h${level}><p>${body}</p>`;
    }),
  ].join("");
}

export function ReviewWorkspace() {
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get("opportunityId");
  const [detail, setDetail] = useState<GridOpportunityDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"in_review" | "approved" | "revision_requested" | "rejected">("in_review");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<false | "approve" | "request_changes" | "rewrite">(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (typeof window === "undefined") return;

      const saved = window.localStorage.getItem(REVIEW_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as GridOpportunityDetail;
          if (!cancelled) {
            setDetail(parsed);
          }
        } catch {
          // Ignore malformed cache.
        }
      }

      if (!opportunityId) return;

      try {
        const response = await fetch(`/api/opportunities/${opportunityId}`);
        const payload = (await response.json()) as { success: boolean; result?: GridOpportunityDetail };
        if (!cancelled && payload.success && payload.result) {
          setDetail(payload.result);
          window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(payload.result));
        }
      } catch {
        // Keep local review cache if network fetch fails.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  const draftStep = useMemo(() => getDraftStep(detail), [detail]);
  const briefStep = useMemo(() => getBriefStep(detail), [detail]);
  const draftPayload = useMemo(() => getStepPayload(draftStep), [draftStep]);
  const briefPayload = useMemo(() => getStepPayload(briefStep), [briefStep]);

  const draftTitle = typeof draftPayload?.h1 === "string" ? draftPayload.h1 : detail?.keyword ?? "Draft review";
  const draftSlug = typeof draftPayload?.slugRecommendation === "string" ? draftPayload.slugRecommendation : null;
  const titleTag = Array.isArray(draftPayload?.titleTagOptions) ? String(draftPayload?.titleTagOptions?.[0] ?? "") : "";
  const metaDescription = Array.isArray(draftPayload?.metaDescriptionOptions)
    ? String(draftPayload?.metaDescriptionOptions?.[0] ?? "")
    : "";
  const targetKeywords = stringifyList(draftPayload?.targetKeywords).length
    ? stringifyList(draftPayload?.targetKeywords)
    : [detail?.keyword].filter(Boolean) as string[];
  const supportingKeywords = Array.isArray(briefPayload?.selectedSecondaryKeywords)
    ? (briefPayload.selectedSecondaryKeywords as Array<Record<string, unknown>>)
        .map((item) => String(item.keyword ?? ""))
        .filter(Boolean)
    : [];
  const ctaSuggestions = stringifyList(draftPayload?.ctaSuggestions);
  const editorNotes = stringifyList(draftPayload?.editorNotes);
  const internalLinks = Array.isArray(briefPayload?.recommendedInternalLinks)
    ? (briefPayload.recommendedInternalLinks as Array<Record<string, unknown>>)
        .map((item) => String(item.anchorText ?? ""))
        .filter(Boolean)
    : [];
  const briefAnalysis = (briefPayload?.analysis ?? null) as Record<string, unknown> | null;
  const outline = Array.isArray(briefAnalysis?.outline)
    ? (briefAnalysis.outline as Array<Record<string, unknown>>)
    : [];
  const competitorSummary = typeof briefAnalysis?.competitorSummary === "string" ? briefAnalysis.competitorSummary : "";

  const renderedPreview = draftPreviewHtml(draftPayload, draftTitle);
  const draftStepId = draftStep?.id ?? null;
  const canUseWorkflowStepActions =
    Boolean(draftStepId) &&
    !draftStepId?.startsWith("local_") &&
    !draftStepId?.startsWith("pending_") &&
    !draftStepId?.startsWith("mock_");

  function persistUpdatedDetail(nextDetail: GridOpportunityDetail) {
    setDetail(nextDetail);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(nextDetail));
    }
  }

  function applyLocalReview(nextStatus: "approved" | "revision_requested" | "rejected") {
    if (!detail) return;

    const nextDetail: GridOpportunityDetail = {
      ...detail,
      rowStatus: nextStatus === "approved" ? "approved" : "blocked",
      revisionNotes:
        nextStatus === "approved"
          ? detail.revisionNotes
          : [
              {
                id: `review_note_${Date.now()}`,
                note: notes || (nextStatus === "rejected" ? "Draft rejected." : "Changes requested."),
                requestedBy: "reviewer@cookunity.local",
                createdAt: new Date().toISOString(),
              },
              ...detail.revisionNotes,
            ],
    };

    persistUpdatedDetail(nextDetail);
    setStatus(nextStatus);
    setMessage(
      nextStatus === "approved"
        ? "Draft approved in the review workspace."
        : nextStatus === "rejected"
          ? "Draft rejected in the review workspace."
          : "Change request saved in the review workspace.",
    );
  }

  async function persistRevisionRequest() {
    if (!notes.trim()) {
      setMessage("Add change request notes before saving feedback.");
      return;
    }
    if (!detail || !draftStepId || !canUseWorkflowStepActions) {
      applyLocalReview("revision_requested");
      return;
    }
    setPending("request_changes");
    setMessage(null);
    try {
      const payload = await requestJson(`/api/workflow/steps/${draftStepId}/revision`, {
        method: "POST",
        body: JSON.stringify({ note: notes.trim() }),
      });
      if (payload.result) {
        persistUpdatedDetail(payload.result);
      }
      setStatus("revision_requested");
      setMessage("Change request saved. Use Rewrite draft to generate the next version from this feedback.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save change request.");
    } finally {
      setPending(false);
    }
  }

  async function rewriteDraftFromFeedback() {
    if (!notes.trim()) {
      setMessage("Add draft feedback before rewriting.");
      return;
    }
    if (!detail || !draftStepId || !canUseWorkflowStepActions) {
      applyLocalReview("revision_requested");
      setMessage("Saved feedback locally. Open the source row in Bulk editor and rerun Draft to apply it.");
      return;
    }
    setPending("rewrite");
    setMessage(null);
    try {
      await requestJson(`/api/workflow/steps/${draftStepId}/revision`, {
        method: "POST",
        body: JSON.stringify({ note: notes.trim() }),
      });
      const rerunPayload = await requestJson(`/api/workflow/steps/${draftStepId}/rerun`, {
        method: "POST",
        body: JSON.stringify({ note: notes.trim() }),
      });
      if (rerunPayload.result) {
        persistUpdatedDetail(rerunPayload.result);
      }
      setStatus("in_review");
      setMessage("Draft rewritten from review feedback.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to rewrite draft.");
    } finally {
      setPending(false);
    }
  }

  async function approveDraft() {
    if (!detail || !draftStepId || !canUseWorkflowStepActions) {
      applyLocalReview("approved");
      return;
    }
    setPending("approve");
    setMessage(null);
    try {
      const payload = await requestJson(`/api/workflow/steps/${draftStepId}/approve`, {
        method: "POST",
      });
      if (payload.result) {
        persistUpdatedDetail(payload.result);
      }
      setStatus("approved");
      setMessage("Draft approved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to approve draft.");
    } finally {
      setPending(false);
    }
  }

  return (
    <PageShell
      title="Review"
      description="Approve drafts, ask for changes, and move work forward with one clear decision."
      actions={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/" className="app-button">
            Back to work
          </Link>
          <Link href="/grid" className="app-button">
            Open bulk editor
          </Link>
          {opportunityId ? (
            <Link href={`/grid?review=${opportunityId}`} className="app-button is-primary">
              Open source row
            </Link>
          ) : null}
        </div>
      }
    >
      {!detail || !draftPayload ? (
        <section className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">No draft selected</div>
          </div>
          <div className="app-card-body app-stack">
            <p style={{ margin: 0 }}>
              Open a row from Work or Bulk editor, then write a draft before reviewing it here.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/" className="app-button">
                Open work queue
              </Link>
              <Link href="/grid" className="app-button is-primary">
                Open bulk editor
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="app-review-layout">
          <div className="app-card">
            <div className="app-card-head">
              <div>
                <div className="app-card-title">Draft</div>
                <div className="app-card-meta">
                  {detail.path === "blog" ? "Blog capture workflow" : "Landing page conversion workflow"}
                </div>
              </div>
              <div className="app-card-meta">
                <span className="app-badge is-warning">{status === "in_review" ? "Needs review" : status.replace("_", " ")}</span>
              </div>
            </div>
            <div className="app-card-body app-stack">
              <div style={{ display: "grid", gap: 8 }}>
                <div className="app-muted"><strong>Title:</strong> {draftTitle}</div>
                {draftSlug ? <div className="app-muted"><strong>Slug:</strong> {draftSlug}</div> : null}
                {titleTag ? <div className="app-muted"><strong>Title tag:</strong> {titleTag}</div> : null}
                {metaDescription ? <div className="app-muted"><strong>Meta description:</strong> {metaDescription}</div> : null}
                <div className="app-muted"><strong>Primary and supporting keywords:</strong> {[...targetKeywords, ...supportingKeywords].join(", ")}</div>
              </div>

              <div className="app-copy-preview" dangerouslySetInnerHTML={{ __html: renderedPreview }} />
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div className="app-card">
              <div className="app-card-head">
                <div className="app-card-title">Recommended next step</div>
              </div>
              <div className="app-card-body app-stack">
                <p style={{ margin: 0 }}>
                  {status === "in_review"
                    ? "Review the intro, keyword coverage, and CTA. If those three pieces hold, approve the draft."
                    : status === "approved"
                      ? "This draft has already been approved. Publish it or send it back for changes if something broke."
                      : "This draft needs changes before it can move forward."}
                </p>
              </div>
            </div>

            <div className="app-card">
              <div className="app-card-head">
                <div className="app-card-title">What to check</div>
              </div>
              <div className="app-card-body app-stack">
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Brand and tone</div>
                  <div className="app-muted">
                    {editorNotes.length
                      ? editorNotes.join(" ")
                      : "Keep the copy clear, premium, and grounded. Avoid generic subscription-food language."}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>SEO coverage</div>
                  <div className="app-muted">
                    {targetKeywords.length
                      ? `Primary focus: ${targetKeywords.join(", ")}.`
                      : "Make sure the primary keyword is answered directly near the top."}{" "}
                    {supportingKeywords.length ? `Supporting terms: ${supportingKeywords.join(", ")}.` : ""}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>CTA</div>
                  <div className="app-muted">
                    {ctaSuggestions.length
                      ? ctaSuggestions.join(" ")
                      : detail.path === "blog"
                        ? "Use a light capture CTA that bridges into menu exploration."
                        : "Use a direct trial CTA with a clear conversion path."}
                  </div>
                </div>
              </div>
            </div>

            <div className="app-card">
              <div className="app-card-head">
                <div className="app-card-title">Brief context</div>
              </div>
              <div className="app-card-body app-stack">
                {competitorSummary ? (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>What competitors cover</div>
                    <div className="app-muted">{competitorSummary}</div>
                  </div>
                ) : null}
                {outline.length ? (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Proposed structure</div>
                    <div className="app-stack">
                      {outline.slice(0, 6).map((item, index) => (
                        <div key={`${String(item.heading ?? "outline")}_${index}`} className="app-muted">
                          <strong>{`H${String(item.level ?? 2)} • ${String(item.heading ?? "")}`}</strong>
                          {item.notes ? ` — ${String(item.notes)}` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {internalLinks.length ? (
                  <div className="app-muted">
                    <strong>Internal links:</strong> {internalLinks.join(", ")}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="app-card">
              <div className="app-card-head">
                <div className="app-card-title">Actions</div>
              </div>
              <div className="app-card-body app-form-stack">
                {message ? (
                  <div className="air-banner-error" style={{ borderColor: "#d9e6d8", background: "#f4fbf3", color: "#245135" }}>
                    {message}
                  </div>
                ) : null}
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add review notes"
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="app-button is-primary" disabled={Boolean(pending)} onClick={() => void approveDraft()}>
                    Approve draft
                  </button>
                  <button type="button" className="app-button" disabled={Boolean(pending)} onClick={() => void persistRevisionRequest()}>
                    Ask for changes
                  </button>
                  <button type="button" className="app-button" disabled={Boolean(pending)} onClick={() => void rewriteDraftFromFeedback()}>
                    Rewrite draft
                  </button>
                  <button type="button" className="app-button" disabled={Boolean(pending)} onClick={() => applyLocalReview("rejected")}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
