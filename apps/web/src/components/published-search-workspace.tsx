"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { DashboardPublicationSummary } from "../lib/data";

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function buildHeadlineNotes(item: DashboardPublicationSummary) {
  const preview = item.preview;
  if (!preview) {
    return ["No draft preview is attached to this published record yet."];
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

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const preview = item.preview;
      return [
        item.title,
        item.slug,
        preview?.titleTag ?? "",
        preview?.h1 ?? "",
        ...(preview?.targetKeywords ?? []),
      ].some((value) => normalize(value).includes(normalizedQuery));
    });
  }, [deferredQuery, items]);

  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

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
                      <div className="app-muted">{item.preview?.titleTag ?? "No title tag preview"}</div>
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
              {selected?.preview ? (
                <>
                  <div style={{ display: "grid", gap: 6, padding: 12, border: "1px solid #e2d7c7", borderRadius: 10, background: "#fff" }}>
                    <div><strong>H1:</strong> {selected.preview.h1}</div>
                    <div><strong>Title tag:</strong> {selected.preview.titleTag}</div>
                    <div><strong>Meta description:</strong> {selected.preview.metaDescription || "Not available"}</div>
                    <div><strong>Tracked keywords:</strong> {selected.preview.targetKeywords.join(", ") || "Not available"}</div>
                    <div>
                      <strong>Live page:</strong>{" "}
                      <a
                        href={`https://www.cookunity.com/blog/${selected.slug}`}
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
                    {buildHeadlineNotes(selected).map((note, index) => (
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
                    dangerouslySetInnerHTML={{ __html: selected.preview.html }}
                  />
                </>
              ) : (
                <div className="app-muted">This published record does not have a draft preview attached yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
