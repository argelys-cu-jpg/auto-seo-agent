import { getDashboardData } from "../lib/data";
import { Panel, Badge, MetricCard } from "../components/cards";
import { PageShell } from "../components/page-shell";
import Link from "next/link";

export default async function HomePage() {
  const data = await getDashboardData();

  return (
    <PageShell title="Autonomous SEO Operations">
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginBottom: 18 }}>
        <MetricCard label="App Model" value="Single App" detail="All agents run inside one governed product surface." />
        <MetricCard label="Orchestrator" value={data.workflowRun.orchestrator} detail={`State: ${data.workflowRun.state}`} />
        <MetricCard label="Internal Agents" value={data.agentControlRows.length} detail="Specialized, prompt-isolated, retry-safe." />
        <MetricCard label="Review Status" value="Manual Gate" detail="Publishing blocked until explicit approval." />
      </div>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
        <div style={{ gridColumn: "span 8" }}>
          <Panel title="Top Opportunities">
            <div style={{ display: "grid", gap: 12 }}>
              {data.prioritized.slice(0, 5).map((topic) => (
                <div key={topic.keyword} style={{ borderTop: "1px solid #eee3d2", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <strong>{topic.keyword}</strong>
                    <Badge>{topic.recommendation}</Badge>
                  </div>
                  <div style={{ fontSize: 14, color: "#4f5d53", marginTop: 6 }}>
                    Score {topic.totalScore} • Cannibalization risk {topic.cannibalizationRisk}
                  </div>
                  <p style={{ marginBottom: 0 }}>{topic.explanation}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div style={{ gridColumn: "span 4", display: "grid", gap: 18 }}>
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
