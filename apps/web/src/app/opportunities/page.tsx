import Link from "next/link";
import { PageShell } from "../../components/page-shell";
import { Panel, Badge } from "../../components/cards";
import { getDashboardData } from "../../lib/data";

export default async function OpportunitiesPage() {
  const data = await getDashboardData();

  return (
    <PageShell title="Opportunity Queue">
      <Panel title="Ranked Backlog">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Keyword</th>
              <th>Score</th>
              <th>Recommendation</th>
              <th>Topic Type</th>
            </tr>
          </thead>
          <tbody>
            {data.prioritized.map((topic) => (
              <tr key={topic.keyword} style={{ borderTop: "1px solid #eadfce" }}>
                <td style={{ padding: "12px 0" }}>
                  <Link href={`/topics/${encodeURIComponent(topic.keyword)}`}>{topic.keyword}</Link>
                </td>
                <td>{topic.totalScore}</td>
                <td><Badge>{topic.recommendation}</Badge></td>
                <td>{topic.topicType}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.prioritized.length === 0 ? <p style={{ marginBottom: 0 }}>No persisted opportunities yet. Run the worker discovery job.</p> : null}
      </Panel>
    </PageShell>
  );
}
