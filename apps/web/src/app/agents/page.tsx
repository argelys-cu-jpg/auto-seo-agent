import { MetricCard, Panel, Badge } from "../../components/cards";
import { PageShell } from "../../components/page-shell";
import { getDashboardData } from "../../lib/data";

export default async function AgentControlPage() {
  const data = await getDashboardData();

  return (
    <PageShell title="Single-App Agent Control Center">
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(12, minmax(0, 1fr))", marginBottom: 18 }}>
        <div style={{ gridColumn: "span 3" }}>
          <MetricCard label="Deployment Model" value="One App" detail="One dashboard, one worker, one orchestrator, many internal agents." />
        </div>
        <div style={{ gridColumn: "span 3" }}>
          <MetricCard label="Orchestrator" value={data.workflowRun.orchestrator} detail={`Workflow state: ${data.workflowRun.state}`} />
        </div>
        <div style={{ gridColumn: "span 3" }}>
          <MetricCard label="Agents" value={data.agentControlRows.length} detail="All agents run under orchestrator control." />
        </div>
        <div style={{ gridColumn: "span 3" }}>
          <MetricCard label="Approval Gate" value="Required" detail="Publishing remains blocked until reviewer approval." />
        </div>
      </div>

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1.15fr 0.85fr" }}>
        <Panel title="Agent Roster">
          <div style={{ display: "grid", gap: 14 }}>
            {data.agentControlRows.map((row) => (
              <div key={row.name} style={{ borderTop: "1px solid #e9decd", paddingTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 16 }}>{row.name}</strong>
                  <Badge>{row.latestStatus}</Badge>
                </div>
                <p style={{ marginBottom: 8 }}>{row.responsibility}</p>
                <div style={{ fontSize: 14, color: "#55665a", display: "grid", gap: 4 }}>
                  <div><strong>Input:</strong> {row.inputContract}</div>
                  <div><strong>Output:</strong> {row.outputContract}</div>
                  <div><strong>Prompt:</strong> {row.promptIsolation}</div>
                  <div><strong>Retry-safe:</strong> {row.retrySafe ? "yes" : "no"}</div>
                  <div><strong>Latest run:</strong> {row.latestRunAt}</div>
                </div>
                <form action={`/api/agents/${row.name}/rerun`} method="post" style={{ marginTop: 12 }}>
                  {row.name === "publishing_strapi" ? (
                    <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, fontSize: 14 }}>
                      <input type="checkbox" name="approved" value="true" />
                      Confirm human approval before rerunning publish
                    </label>
                  ) : null}
                  <button type="submit">Rerun This Agent</button>
                </form>
              </div>
            ))}
          </div>
        </Panel>

        <div style={{ display: "grid", gap: 18 }}>
          <Panel title="Orchestrator Timeline">
            <div style={{ display: "grid", gap: 12 }}>
              {data.orchestratorTimeline.map((event) => (
                <div key={`${event.at}-${event.agent}`} style={{ borderTop: "1px solid #e9decd", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <strong>{event.state}</strong>
                    <Badge>{event.agent}</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: "#5a6a5f", marginTop: 4 }}>{event.at}</div>
                  <p style={{ marginBottom: 0 }}>{event.summary}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Control Rules">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Agents operate inside one app boundary.</li>
              <li>Agents do not transition state independently.</li>
              <li>The orchestrator decides sequencing, retries, and approval gates.</li>
              <li>The publishing agent remains idle until review approval is recorded.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
