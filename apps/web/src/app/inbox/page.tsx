import Link from "next/link";
import { PageShell } from "../../components/page-shell";
import { Panel, Badge } from "../../components/cards";
import { getDashboardData } from "../../lib/data";

export default async function InboxPage() {
  const data = await getDashboardData();
  const topics = data.persistedTopics;

  const discovered = topics.filter((topic) => topic.workflowState === "scored" || topic.workflowState === "queued");
  const inReview = topics.filter((topic) => topic.workflowState === "in_review" || topic.workflowState === "revision_requested");
  const approved = topics.filter((topic) => topic.workflowState === "approved");
  const refresh = topics.filter((topic) => topic.workflowState === "refresh_recommended");

  return (
    <PageShell title="Operational Inbox">
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <Panel title="Opportunity Intake">
          {discovered.length ? (
            <ul>
              {discovered.map((topic) => (
                <li key={topic.id}>
                  <strong>{topic.title}</strong> ({topic.totalScore}) <Badge>{topic.recommendation}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ marginBottom: 0 }}>No scored opportunities yet.</p>
          )}
        </Panel>

        <Panel title="Docs Pending Review">
          {inReview.length ? (
            <ul>
              {inReview.map((topic) => {
                const reviewDocUrl = topic.drafts[0]?.reviewDocUrl;
                return (
                  <li key={topic.id}>
                    <strong>{topic.title}</strong>
                    {reviewDocUrl ? (
                      <>
                        {" "}
                        <a href={reviewDocUrl} target="_blank" rel="noreferrer">
                          Open review doc
                        </a>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ marginBottom: 0 }}>No drafts currently in review.</p>
          )}
        </Panel>

        <Panel title="Approved To Publish">
          {approved.length ? (
            <ul>
              {approved.map((topic) => (
                <li key={topic.id}>
                  <strong>{topic.title}</strong> <Badge>approved</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ marginBottom: 0 }}>No approved drafts waiting to publish.</p>
          )}
        </Panel>

        <Panel title="Refresh Queue">
          {refresh.length ? (
            <ul>
              {refresh.map((topic) => (
                <li key={topic.id}>
                  <strong>{topic.title}</strong>: {topic.rationale}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ marginBottom: 0 }}>No refresh recommendations yet.</p>
          )}
        </Panel>
      </div>

      <Panel title="Next Actions">
        <p style={{ marginTop: 0 }}>
          The inbox is backed by persisted workflow state. Discovery and monitoring come from the worker. Review items should open into Google Docs when that integration is configured.
        </p>
        <Link href="/grid">Open workflow grid</Link>
      </Panel>
    </PageShell>
  );
}
