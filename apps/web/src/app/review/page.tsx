import { PageShell } from "../../components/page-shell";
import { Panel, Badge } from "../../components/cards";
import { getDashboardData } from "../../lib/data";

export default async function ReviewPage() {
  const data = await getDashboardData();

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
        </Panel>
        <Panel title="Reviewer Actions">
          <form action="/api/review/draft_healthy_meal_delivery" method="post">
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
          <form action="/api/review/draft_healthy_meal_delivery" method="post" style={{ marginTop: 10 }}>
            <input type="hidden" name="decision" value="request_revision" />
            <textarea
              name="notes"
              placeholder="What should change?"
              style={{ width: "100%", minHeight: 120, marginBottom: 12 }}
            />
            <button type="submit">Request Revision</button>
          </form>
          <form action="/api/review/draft_healthy_meal_delivery" method="post" style={{ marginTop: 10 }}>
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
