import Link from "next/link";

import { PageShell } from "../../components/page-shell";
import { getDashboardData } from "../../lib/data";

export default async function InboxPage() {
  const data = await getDashboardData();
  const topics = data.persistedTopics;

  const discovered = topics.filter((topic) => topic.workflowState === "scored" || topic.workflowState === "queued");
  const inReview = topics.filter((topic) => topic.workflowState === "in_review" || topic.workflowState === "revision_requested");
  const approved = topics.filter((topic) => topic.workflowState === "approved");
  const refresh = topics.filter((topic) => topic.workflowState === "refresh_recommended");

  return (
    <PageShell
      title="Operational inbox"
      description="The live intake surface for scored opportunities, review work, approved drafts, and refresh tasks."
      actions={<Link href="/grid" className="app-button is-primary">Open grid</Link>}
    >
      <section className="app-grid-2">
        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Opportunity intake</div>
            <div className="app-card-meta">{discovered.length} items</div>
          </div>
          <div className="app-card-body">
            <div className="app-list">
              {discovered.length ? discovered.map((topic) => (
                <div key={topic.id} className="app-list-item">
                  <div className="app-list-title">
                    <span>{topic.title}</span>
                    <span className="app-badge">{topic.recommendation}</span>
                  </div>
                  <div className="app-list-meta">Score {topic.totalScore}</div>
                  <div>
                    <Link href="/grid" className="app-inline-link">Open workflow row</Link>
                  </div>
                </div>
              )) : <div className="app-muted">No scored opportunities yet.</div>}
            </div>
          </div>
        </div>

        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Docs pending review</div>
            <div className="app-card-meta">{inReview.length} items</div>
          </div>
          <div className="app-card-body">
            <div className="app-list">
              {inReview.length ? inReview.map((topic) => {
                const reviewDocUrl = topic.drafts[0]?.reviewDocUrl;
                return (
                  <div key={topic.id} className="app-list-item">
                    <div className="app-list-title">
                      <span>{topic.title}</span>
                      <span className="app-badge is-warning">{topic.workflowState}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <Link href="/review" className="app-inline-link">Open review queue</Link>
                      {reviewDocUrl ? (
                        <a href={reviewDocUrl} target="_blank" rel="noreferrer" className="app-inline-link">
                          Open review doc
                        </a>
                      ) : (
                        <span className="app-muted">Review doc not created yet.</span>
                      )}
                    </div>
                  </div>
                );
              }) : <div className="app-muted">No drafts currently in review.</div>}
            </div>
          </div>
        </div>

        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Approved to publish</div>
            <div className="app-card-meta">{approved.length} items</div>
          </div>
          <div className="app-card-body">
            <div className="app-list">
              {approved.length ? approved.map((topic) => (
                <div key={topic.id} className="app-list-item">
                  <div className="app-list-title">
                    <span>{topic.title}</span>
                    <span className="app-badge is-success">approved</span>
                  </div>
                  <div>
                    <Link href="/published" className="app-inline-link">View publish inventory</Link>
                  </div>
                </div>
              )) : <div className="app-muted">No approved drafts waiting to publish.</div>}
            </div>
          </div>
        </div>

        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Refresh queue</div>
            <div className="app-card-meta">{refresh.length} items</div>
          </div>
          <div className="app-card-body">
            <div className="app-list">
              {refresh.length ? refresh.map((topic) => (
                <div key={topic.id} className="app-list-item">
                  <div className="app-list-title">
                    <span>{topic.title}</span>
                    <span className="app-badge is-warning">refresh</span>
                  </div>
                  <div className="app-muted">{topic.rationale}</div>
                  <div>
                    <Link href="/recommendations" className="app-inline-link">Open refresh tasks</Link>
                  </div>
                </div>
              )) : <div className="app-muted">No refresh recommendations yet.</div>}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
