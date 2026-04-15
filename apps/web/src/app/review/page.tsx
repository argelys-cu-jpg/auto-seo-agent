import { PageShell } from "../../components/page-shell";
import { Panel, Badge } from "../../components/cards";
import { getDashboardData } from "../../lib/data";

export default async function ReviewPage() {
  const data = await getDashboardData();
  const activeDraftId = data.draft.id;

  return (
    <PageShell title="Human Review Queue">
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr 1fr" }}>
        <Panel title="Review Package">
          <p><Badge>in_review</Badge></p>
          <p><strong>Topic rationale:</strong> {data.queuedTopics[0]?.explanation}</p>
          <p><strong>Target keywords:</strong> {data.draft.targetKeywords.join(", ")}</p>
          <p><strong>Outline:</strong></p>
          <ul>
            {data.draft.sections.map((section) => (
              <li key={section.heading}>{section.heading}</li>
            ))}
          </ul>
          <p><strong>Metadata:</strong> {data.draft.titleTagOptions[0]} / {data.draft.metaDescriptionOptions[0]}</p>
          <p><strong>Internal links:</strong> {data.brief.recommendedInternalLinks.map((link) => link.anchorText).join(", ")}</p>
          <p><strong>Schema:</strong> {data.draft.schemaSuggestions.join(", ")}</p>
          {"reviewDocUrl" in data.draft && typeof data.draft.reviewDocUrl === "string" ? (
            <p>
              <strong>Review doc:</strong>{" "}
              <a href={data.draft.reviewDocUrl} target="_blank" rel="noreferrer">
                Open review document
              </a>
            </p>
          ) : null}

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #eadfce" }}>
            <p style={{ marginTop: 0 }}><strong>Draft copy</strong></p>
            <p><strong>H1:</strong> {data.draft.h1}</p>
            <p><strong>Slug:</strong> {data.draft.slugRecommendation}</p>
            <p><strong>Intro:</strong></p>
            <p>{data.draft.intro}</p>
            {data.draft.sections.map((section) => (
              <div key={section.heading} style={{ marginTop: 16 }}>
                <p style={{ marginBottom: 6 }}><strong>{`H${section.level}: ${section.heading}`}</strong></p>
                <p style={{ marginTop: 0 }}>{section.body}</p>
              </div>
            ))}
            <p style={{ marginTop: 16 }}><strong>FAQ Copy:</strong></p>
            <ul>
              {data.draft.faq.map((item) => (
                <li key={item.question}>
                  <strong>{item.question}</strong>: {item.answer}
                </li>
              ))}
            </ul>
            <p><strong>CTA Suggestions:</strong> {data.draft.ctaSuggestions.join(", ")}</p>
            <p><strong>Editor Notes:</strong> {data.draft.editorNotes.join(" ")}</p>

            <div style={{ marginTop: 18 }}>
              <p style={{ marginBottom: 8 }}><strong>Rendered article preview</strong></p>
              <div
                style={{
                  maxHeight: 420,
                  overflowY: "auto",
                  border: "1px solid #e2d7c7",
                  borderRadius: 10,
                  padding: 12,
                  background: "#fff",
                }}
                dangerouslySetInnerHTML={{ __html: data.draft.html }}
              />
            </div>
          </div>
        </Panel>
        <Panel title="Reviewer Actions">
          <form action={`/api/review/${activeDraftId}`} method="post">
            <input type="hidden" name="decision" value="approve" />
            <textarea
              name="notes"
              placeholder="Add review notes"
              style={{ width: "100%", minHeight: 120, marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit">Approve</button>
            </div>
          </form>
          <form action={`/api/review/${activeDraftId}`} method="post" style={{ marginTop: 10 }}>
            <input type="hidden" name="decision" value="request_revision" />
            <textarea
              name="notes"
              placeholder="What should change?"
              style={{ width: "100%", minHeight: 120, marginBottom: 12 }}
            />
            <button type="submit">Request Revision</button>
          </form>
          <form action={`/api/review/${activeDraftId}`} method="post" style={{ marginTop: 10 }}>
            <input type="hidden" name="decision" value="reject" />
            <textarea
              name="notes"
              placeholder="Why reject this topic?"
              style={{ width: "100%", minHeight: 120, marginBottom: 12 }}
            />
            <button type="submit">Reject</button>
          </form>
        </Panel>
      </div>
    </PageShell>
  );
}
