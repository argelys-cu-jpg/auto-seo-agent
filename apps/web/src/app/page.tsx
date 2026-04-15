import { getDashboardData } from "../lib/data";
import { Panel, Badge, MetricCard } from "../components/cards";
import { PageShell } from "../components/page-shell";
import Link from "next/link";

export default async function HomePage() {
  const data = await getDashboardData();
  const pendingReviewCount = data.persistedTopics.filter(
    (topic) => topic.workflowState === "in_review" || topic.workflowState === "revision_requested",
  ).length;
  const approvedCount = data.persistedTopics.filter((topic) => topic.workflowState === "approved").length;
  const refreshCount = data.persistedTopics.filter((topic) => topic.workflowState === "refresh_recommended").length;

  return (
    <PageShell title="Autonomous SEO Operations">
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginBottom: 18 }}>
        <MetricCard label="App Model" value="Single App" detail="All agents run inside one governed product surface." />
        <MetricCard label="Orchestrator" value={data.workflowRun.orchestrator} detail={`State: ${data.workflowRun.state}`} />
        <MetricCard label="Internal Agents" value={data.agentControlRows.length} detail="Specialized, prompt-isolated, retry-safe." />
        <MetricCard label="Pending Review" value={pendingReviewCount} detail={`${approvedCount} approved • ${refreshCount} refresh tasks`} />
      </div>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
        <div style={{ gridColumn: "span 8" }}>
          <Panel title="Operational Inbox Snapshot">
            <div style={{ display: "grid", gap: 12 }}>
              {data.persistedTopics.slice(0, 5).map((topic) => (
                <div key={topic.id} style={{ borderTop: "1px solid #eee3d2", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <strong>{topic.title}</strong>
                    <Badge>{topic.workflowState}</Badge>
                  </div>
                  <div style={{ fontSize: 14, color: "#4f5d53", marginTop: 6 }}>
                    Score {topic.totalScore} • Recommendation {topic.recommendation} • Cannibalization risk {topic.cannibalizationRisk}
                  </div>
                  <p style={{ marginBottom: 0 }}>{topic.rationale}</p>
                </div>
              ))}
              {data.persistedTopics.length === 0 ? <p style={{ marginBottom: 0 }}>No persisted topics yet. Run discovery from the worker.</p> : null}
            </div>
          </Panel>
        </div>
        <div style={{ gridColumn: "span 4", display: "grid", gap: 18 }}>
          <Panel title="Ops Inbox">
            <p style={{ marginTop: 0 }}>
              Review live queues for discovery, Docs review, approved drafts, and refresh work from a single operational inbox.
            </p>
            <Link
              href="/inbox"
              style={{
                display: "inline-flex",
                padding: "10px 14px",
                borderRadius: 999,
                background: "#203a2d",
                color: "#fffaf2",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Open Operational Inbox
            </Link>
          </Panel>
          <Panel title="Agent Control">
            <p style={{ marginTop: 0 }}>
              All seven agents work from the same app and the same orchestrator-controlled workflow.
            </p>
            <Link
              href="/agents"
              style={{
                display: "inline-flex",
                padding: "10px 14px",
                borderRadius: 999,
                background: "#203a2d",
                color: "#fffaf2",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Open Agent Control Center
            </Link>
          </Panel>
          <Panel title="Image Cropper">
            <p style={{ marginTop: 0 }}>
              Upload any image and export a 1200 x 600 asset with a center-first smart crop for CookUnity creative.
            </p>
            <Link
              href="/cropper"
              style={{
                display: "inline-flex",
                padding: "10px 14px",
                borderRadius: 999,
                background: "#203a2d",
                color: "#fffaf2",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Open Cropper
            </Link>
          </Panel>
          <Panel title="Review Gate">
            <p style={{ marginTop: 0 }}>
              The system can discover, score, outline, draft, monitor, and recommend refreshes automatically.
            </p>
            <p style={{ marginBottom: 0, fontWeight: 700 }}>Publishing remains blocked until a reviewer approves.</p>
          </Panel>
          <Panel title="Continuous Ops">
            <p style={{ marginTop: 0, marginBottom: 8 }}>
              Discovery: <strong>{data.automationStatus.discoveryCron}</strong>
            </p>
            <p style={{ margin: "0 0 8px" }}>
              Monitoring: <strong>{data.automationStatus.monitoringCron}</strong>
            </p>
            <p style={{ margin: "0 0 12px" }}>
              Refresh: <strong>{data.automationStatus.refreshCron}</strong>
            </p>
            <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
              {data.integrations.map((integration) => (
                <div key={integration.name}>
                  <strong>{integration.name}:</strong> {integration.status}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Current Draft">
            <div style={{ fontWeight: 700 }}>{data.draft.h1}</div>
            <p>{data.draft.metaDescriptionOptions[0]}</p>
            <Badge>in_review</Badge>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
