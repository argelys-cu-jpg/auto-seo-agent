import Link from "next/link";

import { PageShell } from "../components/page-shell";
import { getDashboardData } from "../lib/data";

export default async function HomePage() {
  const data = await getDashboardData();
  const pendingReviewCount = data.persistedTopics.filter(
    (topic) => topic.workflowState === "in_review" || topic.workflowState === "revision_requested",
  ).length;
  const approvedCount = data.persistedTopics.filter((topic) => topic.workflowState === "approved").length;
  const refreshCount = data.persistedTopics.filter((topic) => topic.workflowState === "refresh_recommended").length;

  return (
    <PageShell
      title="Operations overview"
      description="One product surface for opportunity intake, workflow control, human review, publishing, and refresh work."
      actions={
        <>
          <Link href="/grid" className="app-button is-primary">
            Open workflow grid
          </Link>
          <Link href="/inbox" className="app-button">
            Open inbox
          </Link>
        </>
      }
    >
      <section className="app-stat-grid">
        <div className="app-stat">
          <div className="app-stat-label">Workflow model</div>
          <div className="app-stat-value">Single app</div>
          <div className="app-stat-detail">All operators, workflows, and review gates live in one governed surface.</div>
        </div>
        <div className="app-stat">
          <div className="app-stat-label">Orchestrator</div>
          <div className="app-stat-value">{data.workflowRun.orchestrator}</div>
          <div className="app-stat-detail">State: {data.workflowRun.state}</div>
        </div>
        <div className="app-stat">
          <div className="app-stat-label">Internal agents</div>
          <div className="app-stat-value">{data.agentControlRows.length}</div>
          <div className="app-stat-detail">Prompt-isolated, retry-safe, review-gated.</div>
        </div>
        <div className="app-stat">
          <div className="app-stat-label">Review queue</div>
          <div className="app-stat-value">{pendingReviewCount}</div>
          <div className="app-stat-detail">{approvedCount} approved • {refreshCount} refresh tasks</div>
        </div>
      </section>

      <section className="app-grid-sidebar">
        <div className="app-section">
          <div className="app-card">
            <div className="app-card-head">
              <div className="app-card-title">Operational queue</div>
              <div className="app-card-meta">Persisted workflow state</div>
            </div>
            <div className="app-card-body">
              <div className="app-list">
                {data.persistedTopics.slice(0, 6).map((topic) => (
                  <div key={topic.id} className="app-list-item">
                    <div className="app-list-title">
                      <span>{topic.title}</span>
                      <span className="app-badge">{topic.workflowState}</span>
                    </div>
                    <div className="app-list-meta">
                      Score {topic.totalScore} • {topic.recommendation} • Cannibalization {topic.cannibalizationRisk}
                    </div>
                    <div className="app-muted">{topic.rationale}</div>
                  </div>
                ))}
                {data.persistedTopics.length === 0 ? (
                  <div className="app-muted">No persisted topics yet. Run discovery from the worker.</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head">
              <div className="app-card-title">Live system status</div>
              <div className="app-card-meta">Automation and integrations</div>
            </div>
            <div className="app-card-body app-grid-2">
              <div className="app-stack">
                <div className="app-muted">Discovery cadence</div>
                <div>{data.automationStatus.discoveryCron}</div>
              </div>
              <div className="app-stack">
                <div className="app-muted">Monitoring cadence</div>
                <div>{data.automationStatus.monitoringCron}</div>
              </div>
              <div className="app-stack">
                <div className="app-muted">Refresh cadence</div>
                <div>{data.automationStatus.refreshCron}</div>
              </div>
              <div className="app-stack">
                <div className="app-muted">Publish gate</div>
                <div>Manual approval required</div>
              </div>
            </div>
            <div className="app-card-body" style={{ borderTop: "1px solid #eef2f6" }}>
              <div className="app-list">
                {data.integrations.map((integration) => (
                  <div key={integration.name} className="app-list-item">
                    <div className="app-list-title">
                      <span>{integration.name}</span>
                      <span className={`app-badge${integration.status === "connected" ? " is-success" : ""}`}>{integration.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="app-stack">
          <div className="app-card">
            <div className="app-card-head">
              <div className="app-card-title">Operator workspaces</div>
            </div>
            <div className="app-card-body app-stack">
              <Link href="/grid" className="app-inline-link">Workflow grid</Link>
              <Link href="/review" className="app-inline-link">Human review</Link>
              <Link href="/published" className="app-inline-link">Published inventory</Link>
              <Link href="/monitoring" className="app-inline-link">Monitoring</Link>
              <Link href="/recommendations" className="app-inline-link">Refresh tasks</Link>
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head">
              <div className="app-card-title">Current draft</div>
              <div className="app-card-meta">In review</div>
            </div>
            <div className="app-card-body app-stack">
              <div style={{ fontWeight: 600 }}>{data.draft.h1}</div>
              <div className="app-muted">{data.draft.metaDescriptionOptions[0]}</div>
              <div>
                <span className="app-badge is-warning">in_review</span>
              </div>
              <Link href="/review" className="app-inline-link">Open review package</Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
