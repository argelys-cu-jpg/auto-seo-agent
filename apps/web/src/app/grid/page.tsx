import { Badge, Panel } from "../../components/cards";
import { PageShell } from "../../components/page-shell";
import { getWorkflowGridData } from "../../lib/data";

function statusColors(status: string) {
  if (status === "success" || status === "published") {
    return { background: "#e4efe7", color: "#234b38" };
  }
  if (status === "review_needed") {
    return { background: "#fbe8d2", color: "#8a4d14" };
  }
  if (status === "waiting" || status === "pending") {
    return { background: "#ece7df", color: "#5f5a53" };
  }
  return { background: "#eef1f4", color: "#3b5568" };
}

export default async function WorkflowGridPage({
  searchParams,
}: {
  searchParams?: Promise<{ keyword?: string; created?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const data = await getWorkflowGridData(params.keyword);

  return (
    <PageShell title="SEO Workflow Grid">
      <Panel title="AirOps-Style Workflow Table">
        <p style={{ marginTop: 0, maxWidth: 840, lineHeight: 1.6 }}>
          Type a primary keyword to add a row at the top of the grid. Each column maps to one orchestrated agent step,
          so the whole article pipeline is visible in one table instead of being split across multiple pages.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <Badge>{data.persistenceMode === "database" ? "database-backed" : "mock fallback"}</Badge>
          <Badge>{data.databaseReady ? "db connected" : "db unavailable"}</Badge>
          {params.created ? <Badge>row created</Badge> : null}
          {params.error ? <Badge>{`error: ${params.error}`}</Badge> : null}
        </div>
        <form method="post" action="/api/grid/rows" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <input
            type="text"
            name="keyword"
            placeholder="Type a primary keyword, e.g. mediterranean cuisine"
            defaultValue=""
            style={{
              flex: "1 1 420px",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #d9ccb7",
            }}
          />
          <button type="submit">Create Row and Run Workflow</button>
        </form>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1500, borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "12px", background: "#f8f3ea", position: "sticky", left: 0, zIndex: 1 }}>Primary Keyword</th>
                <th style={{ textAlign: "left", padding: "12px", background: "#f8f3ea" }}>Pillar</th>
                <th style={{ textAlign: "left", padding: "12px", background: "#f8f3ea" }}>Theme</th>
                <th style={{ textAlign: "left", padding: "12px", background: "#f8f3ea" }}>Search Volume</th>
                {data.columns.map((column) => (
                  <th key={column.id} style={{ textAlign: "left", padding: "12px", background: "#f8f3ea", minWidth: 220 }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <td
                    style={{
                      padding: "14px 12px",
                      borderTop: "1px solid #eadfce",
                      background: "#fffdf9",
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      verticalAlign: "top",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{row.primaryKeyword}</div>
                    <div style={{ fontSize: 13, color: "#627267", marginTop: 6 }}>{row.contentType}</div>
                  </td>
                  <td style={{ padding: "14px 12px", borderTop: "1px solid #eadfce", verticalAlign: "top" }}>{row.pillar}</td>
                  <td style={{ padding: "14px 12px", borderTop: "1px solid #eadfce", verticalAlign: "top" }}>{row.theme}</td>
                  <td style={{ padding: "14px 12px", borderTop: "1px solid #eadfce", verticalAlign: "top" }}>{row.searchVolume || "TBD"}</td>
                  {row.cells.map((cell) => {
                    const colors = statusColors(cell.status);
                    const reviewPackage = row.reviewPackage;
                    const isReviewCell = cell.step === "editorial_qa" && reviewPackage;
                    return (
                      <td key={`${row.id}-${cell.step}`} style={{ padding: "14px 12px", borderTop: "1px solid #eadfce", verticalAlign: "top" }}>
                        <div
                          style={{
                            border: "1px solid #e2d7c7",
                            borderRadius: 14,
                            padding: 12,
                            background: "#fffaf2",
                            minHeight: 116,
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 800,
                              background: colors.background,
                              color: colors.color,
                            }}
                          >
                            {cell.status}
                          </span>
                          <div style={{ marginTop: 10, fontWeight: 700 }}>{cell.label}</div>
                          <p style={{ marginBottom: 0, fontSize: 14, lineHeight: 1.5, color: "#58685d" }}>{cell.detail}</p>
                          {isReviewCell ? (
                            <details style={{ marginTop: 12 }}>
                              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                                Open article preview
                              </summary>
                              <div
                                style={{
                                  marginTop: 12,
                                  paddingTop: 12,
                                  borderTop: "1px solid #eadfce",
                                  display: "grid",
                                  gap: 12,
                                }}
                              >
                                <div style={{ fontSize: 13, lineHeight: 1.6, color: "#445247" }}>
                                  <div><strong>Rationale:</strong> {reviewPackage.topicRationale}</div>
                                  <div><strong>Keywords:</strong> {reviewPackage.targetKeywords.join(", ")}</div>
                                  <div><strong>Metadata:</strong> {reviewPackage.titleTag} / {reviewPackage.metaDescription}</div>
                                  <div><strong>Links:</strong> {reviewPackage.internalLinks.join(", ") || "None yet"}</div>
                                  <div><strong>Schema:</strong> {reviewPackage.schema.join(", ")}</div>
                                  {reviewPackage.reviewDocUrl ? (
                                    <div>
                                      <strong>Review doc:</strong>{" "}
                                      <a href={reviewPackage.reviewDocUrl} target="_blank" rel="noreferrer">
                                        Open {reviewPackage.reviewDocProvider ?? "review"} doc
                                      </a>
                                    </div>
                                  ) : null}
                                </div>

                                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                                  <div><strong>H1:</strong> {reviewPackage.h1}</div>
                                  <div><strong>Slug:</strong> {reviewPackage.slug}</div>
                                  <div style={{ marginTop: 8 }}><strong>Intro:</strong></div>
                                  <p style={{ marginTop: 6 }}>{reviewPackage.intro}</p>
                                  {reviewPackage.sections.map((section) => (
                                    <div key={`${row.id}-${section.heading}`} style={{ marginTop: 10 }}>
                                      <div style={{ fontWeight: 700 }}>{`H${section.level}: ${section.heading}`}</div>
                                      <p style={{ margin: "6px 0 0", color: "#58685d" }}>{section.body}</p>
                                    </div>
                                  ))}
                                </div>

                                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                                  <div><strong>FAQ copy</strong></div>
                                  <ul style={{ paddingLeft: 18, margin: "8px 0" }}>
                                    {reviewPackage.faq.map((item) => (
                                      <li key={`${row.id}-${item.question}`}>
                                        <strong>{item.question}</strong>: {item.answer}
                                      </li>
                                    ))}
                                  </ul>
                                  <div><strong>CTA:</strong> {reviewPackage.ctaSuggestions.join(", ")}</div>
                                  <div style={{ marginTop: 6 }}><strong>Editor notes:</strong> {reviewPackage.editorNotes.join(" ")}</div>
                                </div>

                                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Rendered preview</div>
                                  <div
                                    style={{
                                      maxHeight: 320,
                                      overflowY: "auto",
                                      border: "1px solid #e2d7c7",
                                      borderRadius: 10,
                                      padding: 12,
                                      background: "#fff",
                                    }}
                                    dangerouslySetInnerHTML={{ __html: reviewPackage.html }}
                                  />
                                </div>

                                <div style={{ display: "grid", gap: 10 }}>
                                  <form action={`/api/review/${reviewPackage.draftId}`} method="post">
                                    <input type="hidden" name="decision" value="approve" />
                                    <textarea
                                      name="notes"
                                      placeholder="Add review notes"
                                      style={{ width: "100%", minHeight: 90, marginBottom: 8 }}
                                    />
                                    <button type="submit">Approve</button>
                                  </form>
                                  <form action={`/api/review/${reviewPackage.draftId}`} method="post">
                                    <input type="hidden" name="decision" value="request_revision" />
                                    <textarea
                                      name="notes"
                                      placeholder="What should change?"
                                      style={{ width: "100%", minHeight: 90, marginBottom: 8 }}
                                    />
                                    <button type="submit">Request Revision</button>
                                  </form>
                                  <form action={`/api/review/${reviewPackage.draftId}`} method="post">
                                    <input type="hidden" name="decision" value="reject" />
                                    <textarea
                                      name="notes"
                                      placeholder="Why reject this article?"
                                      style={{ width: "100%", minHeight: 90, marginBottom: 8 }}
                                    />
                                    <button type="submit">Reject</button>
                                  </form>
                                </div>
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div style={{ marginTop: 18, display: "grid", gap: 18, gridTemplateColumns: "1fr 1fr" }}>
        <Panel title="How It Maps to the Agent System">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>One row = one primary keyword / article candidate.</li>
            <li>One column = one orchestrated agent step.</li>
            <li>The review column remains the manual gate before Strapi publishing.</li>
            <li>Monitoring stays in the same table so refresh work loops back into the grid.</li>
          </ul>
        </Panel>
        <Panel title="Next Iteration">
          <p style={{ marginTop: 0 }}>
            This version now reads persisted workflow rows when Prisma is available. Creating a row stores the topic,
            runs the orchestrated pipeline through QA, and reflects cell state from database records instead of seeded-only UI state.
          </p>
          <Badge>{data.persistenceMode === "database" ? "persistence enabled" : "waiting for database"}</Badge>
          <p style={{ marginBottom: 0, marginTop: 12 }}>
            Health check: <a href="/api/health">/api/health</a>
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}
