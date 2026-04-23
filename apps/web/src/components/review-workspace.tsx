"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageShell } from "./page-shell";
import type { GridOpportunityDetail, GridStepView } from "../lib/workflow-grid-store";

const REVIEW_STORAGE_KEY = "cookunity-review-draft";

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

export function ReviewWorkspace() {
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get("opportunityId");
  const [detail, setDetail] = useState<GridOpportunityDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"in_review" | "approved" | "revision_requested" | "rejected">("in_review");
  const [message, setMessage] = useState<string | null>(null);

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
          // Ignore malformed local cache and continue to network if available.
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
        // Keep local fallback if the live fetch fails.
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

  const draftHtml = typeof draftPayload?.html === "string" ? draftPayload.html : null;
  const draftTitle = typeof draftPayload?.h1 === "string" ? draftPayload.h1 : detail?.keyword ?? "Draft review";
  const draftSlug = typeof draftPayload?.slugRecommendation === "string" ? draftPayload.slugRecommendation : null;
  const draftIntro = typeof draftPayload?.intro === "string" ? draftPayload.intro : null;
  const titleTag = Array.isArray(draftPayload?.titleTagOptions) ? String(draftPayload?.titleTagOptions?.[0] ?? "") : "";
  const metaDescription = Array.isArray(draftPayload?.metaDescriptionOptions) ? String(draftPayload?.metaDescriptionOptions?.[0] ?? "") : "";
  const targetKeywords = Array.isArray(draftPayload?.targetKeywords)
    ? draftPayload.targetKeywords.map((item) => String(item))
    : [detail?.keyword].filter(Boolean) as string[];
  const ctaSuggestions = Array.isArray(draftPayload?.ctaSuggestions)
    ? draftPayload.ctaSuggestions.map((item) => String(item))
    : [];
  const editorNotes = Array.isArray(draftPayload?.editorNotes)
    ? draftPayload.editorNotes.map((item) => String(item))
    : [];
  const internalLinks = Array.isArray(briefPayload?.recommendedInternalLinks)
    ? briefPayload.recommendedInternalLinks.map((item) => {
        const link = item as Record<string, unknown>;
        return String(link.anchorText ?? "");
      }).filter(Boolean)
    : [];

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
      rowStatus: nextStatus === "approved" ? "approved" : nextStatus === "rejected" ? "blocked" : "blocked",
      revisionNotes:
        nextStatus === "revision_requested" || nextStatus === "rejected"
          ? [
              {
                id: `review_note_${Date.now()}`,
                note: notes || (nextStatus === "rejected" ? "Draft rejected." : "Revision requested."),
                requestedBy: "reviewer@cookunity.local",
                createdAt: new Date().toISOString(),
              },
              ...detail.revisionNotes,
            ]
          : detail.revisionNotes,
    };
    persistUpdatedDetail(nextDetail);
    setStatus(nextStatus);
    setMessage(
      nextStatus === "approved"
        ? "Draft approved in the local review workspace."
        : nextStatus === "rejected"
          ? "Draft rejected in the local review workspace."
          : "Revision request saved in the local review workspace.",
    );
  }

  return (
    <PageShell
      title="Human review"
      description="Review the exact draft generated in the workflow grid and capture a decision without leaving the operator workflow."
      actions={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/grid" className="app-button">
            Back to grid
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
            <div className="app-card-title">No draft loaded</div>
          </div>
          <div className="app-card-body app-stack">
            <p style={{ margin: 0 }}>
              Generate a draft from the workflow grid first, then open review from that row.
            </p>
            <Link href="/grid" className="app-button is-primary">
              Open workflow grid
            </Link>
          </div>
        </section>
      ) : (
        <section className="app-review-layout">
          <div className="app-card">
            <div className="app-card-head">
              <div className="app-card-title">Review package</div>
              <div className="app-card-meta">
                <span className="app-badge is-warning">{status}</span>
              </div>
            </div>
            <div className="app-card-body app-stack">
              <div className="app-muted"><strong>Topic:</strong> {detail.keyword}</div>
              <div className="app-muted"><strong>Path:</strong> {detail.path === "blog" ? "Blog capture workflow" : "Landing page conversion workflow"}</div>
              <div className="app-muted"><strong>Target keywords:</strong> {targetKeywords.join(", ")}</div>
              <div className="app-muted"><strong>Metadata:</strong> {titleTag || "n/a"} / {metaDescription || "n/a"}</div>
              <div className="app-muted"><strong>Internal links:</strong> {internalLinks.length ? internalLinks.join(", ") : "n/a"}</div>

              <div className="app-copy-preview">
                <div className="app-stack">
                  <div><strong>H1:</strong> {draftTitle}</div>
                  {draftSlug ? <div><strong>Slug:</strong> {draftSlug}</div> : null}
                  {draftIntro ? <div><strong>Intro:</strong> {draftIntro}</div> : null}
                  {Array.isArray(draftPayload.sections) ? draftPayload.sections.map((section, index) => {
                    const item = section as Record<string, unknown>;
                    return (
                      <div key={`${String(item.heading ?? "section")}_${index}`} className="app-stack">
                        <div><strong>{`H${String(item.level ?? 2)}: ${String(item.heading ?? "")}`}</strong></div>
                        <div className="app-muted">{String(item.body ?? "")}</div>
                      </div>
                    );
                  }) : null}
                  {ctaSuggestions.length ? <div className="app-muted"><strong>CTA suggestions:</strong> {ctaSuggestions.join(", ")}</div> : null}
                  {editorNotes.length ? <div className="app-muted"><strong>Editor notes:</strong> {editorNotes.join(" ")}</div> : null}
                </div>
              </div>

              {draftHtml ? (
                <div className="app-card" style={{ borderRadius: 10 }}>
                  <div className="app-card-head">
                    <div className="app-card-title">Rendered preview</div>
                  </div>
                  <div className="app-card-body">
                    <div className="app-copy-preview" dangerouslySetInnerHTML={{ __html: draftHtml }} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head">
              <div className="app-card-title">Reviewer actions</div>
              <div className="app-card-meta">Local review state for today’s draft</div>
            </div>
            <div className="app-card-body app-stack">
              {message ? <div className="air-banner-error" style={{ borderColor: "#d9e6d8", background: "#f4fbf3", color: "#245135" }}>{message}</div> : null}
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add review notes"
                style={{ minHeight: 120 }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="app-button is-primary" onClick={() => applyLocalReview("approved")}>
                  Approve draft
                </button>
                <button type="button" className="app-button" onClick={() => applyLocalReview("revision_requested")}>
                  Request revision
                </button>
                <button type="button" className="app-button" onClick={() => applyLocalReview("rejected")}>
                  Reject
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
