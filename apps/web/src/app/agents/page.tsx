import Link from "next/link";

import { PageShell } from "../../components/page-shell";
import { getDashboardData } from "../../lib/data";

export default async function AgentControlPage() {
  const data = await getDashboardData();

  return (
    <PageShell
      title="Agent control"
      description="All agents run inside the same product boundary. The orchestrator owns sequencing, retries, and approval gates."
      actions={<Link href="/grid" className="app-button is-primary">Open workflow grid</Link>}
    >
      <section className="app-stat-grid">
        <div className="app-stat">
          <div className="app-stat-label">Deployment model</div>
          <div className="app-stat-value">One app</div>
          <div className="app-stat-detail">One dashboard, one worker, one orchestrator.</div>
        </div>
        <div className="app-stat">
          <div className="app-stat-label">Orchestrator</div>
          <div className="app-stat-value">{data.workflowRun.orchestrator}</div>
          <div className="app-stat-detail">Workflow state: {data.workflowRun.state}</div>
        </div>
        <div className="app-stat">
          <div className="app-stat-label">Agents</div>
          <div className="app-stat-value">{data.agentControlRows.length}</div>
          <div className="app-stat-detail">All agents remain orchestrator-controlled.</div>
        </div>
        <div className="app-stat">
          <div className="app-stat-label">Approval gate</div>
          <div className="app-stat-value">Required</div>
          <div className="app-stat-detail">Publish remains blocked until review is recorded.</div>
        </div>
      </section>

      <section className="app-grid-sidebar">
        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Agent roster</div>
          </div>
          <div className="app-card-body">
            <div className="app-list">
              {data.agentControlRows.map((row) => (
                <div key={row.name} className="app-list-item">
                  <div className="app-list-title">
                    <span>{row.name}</span>
                    <span className="app-badge">{row.latestStatus}</span>
                  </div>
                  <div className="app-muted">{row.responsibility}</div>
                  <div className="app-list-meta">
                    Input: {row.inputContract} • Output: {row.outputContract} • Prompt: {row.promptIsolation}
                  </div>
                  <div className="app-list-meta">Retry-safe: {row.retrySafe ? "yes" : "no"} • Latest run: {row.latestRunAt}</div>
                  <form action={`/api/agents/${row.name}/rerun`} method="post" style={{ marginTop: 4 }}>
                    {row.name === "publishing_strapi" ? (
                      <label className="app-list-meta" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                        <input type="checkbox" name="approved" value="true" />
                        Confirm human approval before rerunning publish
                      </label>
                    ) : null}
                    <button type="submit" className="app-button">Rerun agent</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="app-stack">
          <div className="app-card">
            <div className="app-card-head">
              <div className="app-card-title">Orchestrator timeline</div>
            </div>
            <div className="app-card-body">
              <div className="app-list">
                {data.orchestratorTimeline.map((event) => (
                  <div key={`${event.at}-${event.agent}`} className="app-list-item">
                    <div className="app-list-title">
                      <span>{event.state}</span>
                      <span className="app-badge">{event.agent}</span>
                    </div>
                    <div className="app-list-meta">{event.at}</div>
                    <div className="app-muted">{event.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="app-card">
            <div className="app-card-head">
              <div className="app-card-title">Control rules</div>
            </div>
            <div className="app-card-body">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Agents operate inside one app boundary.</li>
                <li>Agents do not transition state independently.</li>
                <li>The orchestrator decides sequencing, retries, and approval gates.</li>
                <li>The publishing agent stays idle until review approval exists.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
