import { notFound } from "next/navigation";
import { PageShell } from "../../../components/page-shell";
import { Panel, Badge } from "../../../components/cards";
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
    <PageShell title={`Topic Scorecard: ${topic.keyword}`}>
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1.1fr 0.9fr" }}>
        <Panel title="Scorecard">
          <p><strong>Total Score:</strong> {topic.totalScore}</p>
          <p><strong>Recommendation:</strong> <Badge>{topic.recommendation}</Badge></p>
          <p><strong>Cannibalization Risk:</strong> {topic.cannibalizationRisk}</p>
          <p>{topic.explanation}</p>
        </Panel>
        <Panel title="Drafting Snapshot">
          <p><strong>Primary keyword:</strong> {data.brief.primaryKeyword}</p>
          <p><strong>Outline titles:</strong></p>
          <ul>
            {data.brief.titleOptions.map((title) => <li key={title}>{title}</li>)}
          </ul>
        </Panel>
      </div>
    </PageShell>
  );
}
