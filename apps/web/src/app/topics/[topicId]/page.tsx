import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "../../../components/page-shell";
import { getDashboardData } from "../../../lib/data";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const data = await getDashboardData();
  const topic = data.prioritized.find((item) => item.keyword === decodeURIComponent(topicId));
  if (!topic) notFound();

  return (
    <PageShell
      title={`Topic scorecard`}
      description={topic.keyword}
      actions={<Link href="/grid" className="app-button is-primary">Run in workflow grid</Link>}
    >
      <section className="app-grid-sidebar">
        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Scorecard</div>
          </div>
          <div className="app-card-body app-stack">
            <div><strong>Total score:</strong> {topic.totalScore}</div>
            <div><strong>Recommendation:</strong> <span className="app-badge">{topic.recommendation}</span></div>
            <div><strong>Cannibalization risk:</strong> {topic.cannibalizationRisk}</div>
            <div className="app-muted">{topic.explanation}</div>
          </div>
        </div>
        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Drafting snapshot</div>
          </div>
          <div className="app-card-body app-stack">
            <div><strong>Primary keyword:</strong> {data.brief.primaryKeyword}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {data.brief.titleOptions.map((title) => <li key={title}>{title}</li>)}
            </ul>
            <Link href="/review" className="app-inline-link">Open review queue</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
