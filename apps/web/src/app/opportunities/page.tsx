import Link from "next/link";

import { PageShell } from "../../components/page-shell";
import { getDashboardData } from "../../lib/data";

export default async function OpportunitiesPage() {
  const data = await getDashboardData();

  return (
    <PageShell
      title="Opportunity queue"
      description="Scored backlog of topics and page opportunities before they move into active workflow runs."
      actions={<Link href="/grid" className="app-button is-primary">Move to grid</Link>}
    >
      <section className="app-card">
        <div className="app-card-head">
          <div className="app-card-title">Ranked backlog</div>
          <div className="app-card-meta">{data.prioritized.length} opportunities</div>
        </div>
        <div className="app-card-body">
          <div className="app-table-shell">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Score</th>
                  <th>Recommendation</th>
                  <th>Topic type</th>
                </tr>
              </thead>
              <tbody>
                {data.prioritized.map((topic) => (
                  <tr key={topic.keyword}>
                    <td>
                      <Link href={`/topics/${encodeURIComponent(topic.keyword)}`} className="app-inline-link">
                        {topic.keyword}
                      </Link>
                    </td>
                    <td>{topic.totalScore}</td>
                    <td><span className="app-badge">{topic.recommendation}</span></td>
                    <td>
                      <div>{topic.topicType}</div>
                      <Link href="/grid" className="app-inline-link">Run in workflow grid</Link>
                    </td>
                  </tr>
                ))}
                {data.prioritized.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="app-muted">No persisted opportunities yet. Run the worker discovery job.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
