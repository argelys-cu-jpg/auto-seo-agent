import { PageShell } from "../../components/page-shell";
import { getDashboardData } from "../../lib/data";

export default async function ReviewPage() {
  const data = await getDashboardData();
  const activeDraftId = data.draft.id;

  return (
    <PageShell
      title="Human review"
      description="Review the actual draft package, capture revision notes, and block publishing until approval is recorded."
    >
      <section className="app-review-layout">
        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Review package</div>
            <div className="app-card-meta"><span className="app-badge is-warning">in_review</span></div>
          </div>
          <div className="app-card-body app-stack">
            <div className="app-muted"><strong>Topic rationale:</strong> {data.queuedTopics[0]?.explanation}</div>
            <div className="app-muted"><strong>Target keywords:</strong> {data.draft.targetKeywords.join(", ")}</div>
            <div className="app-muted"><strong>Metadata:</strong> {data.draft.titleTagOptions[0]} / {data.draft.metaDescriptionOptions[0]}</div>
            <div className="app-muted"><strong>Internal links:</strong> {data.brief.recommendedInternalLinks.map((link) => link.anchorText).join(", ")}</div>
            <div className="app-muted"><strong>Schema:</strong> {data.draft.schemaSuggestions.join(", ")}</div>
            {"reviewDocUrl" in data.draft && typeof data.draft.reviewDocUrl === "string" ? (
              <a href={data.draft.reviewDocUrl} target="_blank" rel="noreferrer" className="app-inline-link">
                Open review document
              </a>
            ) : null}

            <div className="app-copy-preview">
              <div className="app-stack">
                <div><strong>H1:</strong> {data.draft.h1}</div>
                <div><strong>Slug:</strong> {data.draft.slugRecommendation}</div>
                <div><strong>Intro:</strong> {data.draft.intro}</div>
                {data.draft.sections.map((section) => (
                  <div key={section.heading} className="app-stack">
                    <div><strong>{`H${section.level}: ${section.heading}`}</strong></div>
                    <div className="app-muted">{section.body}</div>
                  </div>
                ))}
                <div className="app-stack">
                  <div><strong>FAQ copy</strong></div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {data.draft.faq.map((item) => (
                      <li key={item.question}>
                        <strong>{item.question}</strong>: {item.answer}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="app-muted"><strong>CTA suggestions:</strong> {data.draft.ctaSuggestions.join(", ")}</div>
                <div className="app-muted"><strong>Editor notes:</strong> {data.draft.editorNotes.join(" ")}</div>
              </div>
            </div>

            <div className="app-card" style={{ borderRadius: 10 }}>
              <div className="app-card-head">
                <div className="app-card-title">Rendered preview</div>
              </div>
              <div className="app-card-body">
                <div className="app-copy-preview" dangerouslySetInnerHTML={{ __html: data.draft.html }} />
              </div>
            </div>
          </div>
        </div>

        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Reviewer actions</div>
            <div className="app-card-meta">Manual gate before publish</div>
          </div>
          <div className="app-card-body app-stack">
            <form action={`/api/review/${activeDraftId}`} method="post" className="app-form-stack">
              <input type="hidden" name="decision" value="approve" />
              <textarea name="notes" placeholder="Add approval notes" />
              <button type="submit" className="app-button is-primary">Approve draft</button>
            </form>

            <form action={`/api/review/${activeDraftId}`} method="post" className="app-form-stack">
              <input type="hidden" name="decision" value="request_revision" />
              <textarea name="notes" placeholder="What should change?" />
              <button type="submit" className="app-button">Request revision</button>
            </form>

            <form action={`/api/review/${activeDraftId}`} method="post" className="app-form-stack">
              <input type="hidden" name="decision" value="reject" />
              <textarea name="notes" placeholder="Why reject this topic?" />
              <button type="submit" className="app-button">Reject</button>
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
