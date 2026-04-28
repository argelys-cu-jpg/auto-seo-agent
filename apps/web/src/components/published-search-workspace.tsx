"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { DashboardPublicationSummary } from "../lib/data";
import type { PublishedSearchItem, PublishedSearchPreview } from "../lib/published-search";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function buildHeadlineNotes(
  item: Pick<DashboardPublicationSummary, "title">,
  preview?: DashboardPublicationSummary["preview"] | PublishedSearchPreview,
) {
  if (!preview) {
    return ["No draft preview is attached to this published record yet."];
  }

  if (!("titleTag" in preview) || !("targetKeywords" in preview)) {
    return [
      `Open the live page to inspect how "${item.title}" is currently positioned.`,
      preview.metaDescription
        ? "A live meta description is available for quick review."
        : "No live meta description could be extracted from this page.",
    ];
  }

  const notes: string[] = [];
  const normalizedTitle = normalize(preview.titleTag);
  const keywordHits = preview.targetKeywords.filter((keyword) => normalizedTitle.includes(normalize(keyword)));

  if (keywordHits.length === 0) {
    notes.push("The current title tag does not include any saved target keywords exactly.");
  } else if (keywordHits.length === 1) {
    notes.push(`The current title tag clearly supports "${keywordHits[0]}".`);
  } else {
    notes.push(`The current title tag supports ${keywordHits.length} tracked keywords: ${keywordHits.join(", ")}.`);
  }

  if (preview.titleTag.length > 60) {
    notes.push("The title tag is over 60 characters and may truncate in search results.");
  } else {
    notes.push("The title tag length is in a workable range for search display.");
  }

  if (!preview.metaDescription) {
    notes.push("No meta description is saved on the latest draft payload.");
  }

  return notes;
}

export function PublishedSearchWorkspace({ items }: { items: DashboardPublicationSummary[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<PublishedSearchItem[]>(items as PublishedSearchItem[]);
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remotePreviews, setRemotePreviews] = useState<Record<string, PublishedSearchPreview>>({});

  useEffect(() => {
    let cancelled = false;
    const normalizedQuery = normalize(deferredQuery);

    async function run() {
      if (!normalizedQuery) {
        setResults(items as PublishedSearchItem[]);
        setSearchError("");
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/published/search?q=${encodeURIComponent(normalizedQuery)}`);
        if (!response.ok) {
          throw new Error("Search failed");
        }
        const body = (await response.json()) as { items: PublishedSearchItem[] };
        if (!cancelled) {
          setResults(body.items);
          setSearchError("");
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearchError("The live blog search is unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [deferredQuery, items]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);
    if (!normalizedQuery) {
      return results;
    }
    return results;
  }, [deferredQuery, results]);

  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  useEffect(() => {
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);
  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );
  const selectedPreview = selected?.preview ?? (selected ? remotePreviews[selected.id] : undefined);

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      if (!selected || selected.preview || remotePreviews[selected.id] || !selected.liveUrl) {
        return;
      }

      try {
        const response = await fetch(`/api/published/preview?url=${encodeURIComponent(selected.liveUrl)}`);
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as { preview: PublishedSearchPreview };
        if (!cancelled) {
          setRemotePreviews((current) => ({ ...current, [selected.id]: body.preview }));
        }
      } catch {
        // Leave preview empty and keep the live link available.
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [remotePreviews, selected]);

  return (
    <div className="app-card">
      <div className="app-card-head">
        <div>
          <div className="app-card-title">Headline search</div>
          <div className="app-card-meta">Search published posts by headline words, slug, title tag, or tracked keywords.</div>
        </div>
      </div>
      <div className="app-card-body" style={{ display: "grid", gap: 16 }}>
        <input
          className="air-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a word from a headline"
        />
        {loading ? <div className="app-muted">Searching published pages…</div> : null}
        {searchError ? <div className="app-muted" style={{ color: "#9b3d2f" }}>{searchError}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 16 }}>
          <div className="app-table-shell" style={{ maxHeight: 720, overflowY: "auto" }}>
            <table className="app-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    style={{ cursor: "pointer", background: item.id === selected?.id ? "#f8fbff" : undefined }}
                  >
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      <div className="app-muted">{item.preview?.titleTag ?? item.liveUrl}</div>
                    </td>
                    <td>{item.slug}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="app-muted">No published posts match this search.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="app-card" style={{ margin: 0 }}>
            <div className="app-card-head">
              <div className="app-card-title">{selected?.title ?? "Select a post"}</div>
              <div className="app-card-meta">{selected?.slug ?? "Choose a published post to preview it."}</div>
            </div>
            <div className="app-card-body" style={{ display: "grid", gap: 12 }}>
              {selected && selectedPreview ? (
                <>
                  <div style={{ display: "grid", gap: 6, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                    <div><strong>H1:</strong> {"targetKeywords" in selectedPreview ? selectedPreview.h1 : selectedPreview.h1}</div>
                    <div><strong>Title tag:</strong> {"titleTag" in selectedPreview ? selectedPreview.titleTag : selectedPreview.title}</div>
                    <div><strong>Meta description:</strong> {selectedPreview.metaDescription || "Not available"}</div>
                    <div><strong>Tracked keywords:</strong> {"targetKeywords" in selectedPreview ? selectedPreview.targetKeywords.join(", ") || "Not available" : "Not available"}</div>
                    <div>
                      <strong>Live page:</strong>{" "}
                      <a
                        href={selected.liveUrl ?? `https://www.cookunity.com/blog/${selected.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="app-inline-link"
                      >
                        Open live page
                      </a>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                    <div style={{ fontWeight: 700 }}>Optimization notes</div>
                    {buildHeadlineNotes(selected, "targetKeywords" in selectedPreview ? selectedPreview : undefined).map((note, index) => (
                      <div key={`${note}_${index}`} className="app-muted">• {note}</div>
                    ))}
                  </div>

                  <div
                    style={{
                      border: "1px solid #e2d7c7",
                      borderRadius: 10,
                      padding: 16,
                      background: "#fff",
                      maxHeight: 520,
                      overflowY: "auto",
                    }}
                    dangerouslySetInnerHTML={{ __html: selectedPreview.html }}
                  />
                </>
              ) : (
                <div className="app-muted">This published record does not have a preview attached yet. Open the live page to inspect it directly.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
