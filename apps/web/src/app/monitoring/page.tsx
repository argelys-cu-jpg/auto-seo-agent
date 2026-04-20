import Link from "next/link";

import { PageShell } from "../../components/page-shell";
import { getDashboardData } from "../../lib/data";

export default async function MonitoringPage() {
  const data = await getDashboardData();
  const monitored = data.persistedTopics.filter((topic) => topic.publications[0]?.metricSnapshots.length);

  return (
    <PageShell
      title="Post-publish monitoring"
      description="Track page-level search performance, spot decline early, and turn performance signals into refresh work."
      actions={<Link href="/recommendations" className="app-button is-primary">Open refresh tasks</Link>}
    >
      <section className="app-card">
        <div className="app-card-head">
          <div className="app-card-title">Active signals</div>
          <div className="app-card-meta">{monitored.length} monitored pages</div>
        </div>
        <div className="app-card-body">
          {monitored.length ? (
            <div className="app-table-shell">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Impressions</th>
                    <th>CTR</th>
                    <th>Avg. position</th>
                  </tr>
                </thead>
                <tbody>
                  {monitored.map((topic) => {
                    const snapshot = topic.publications[0]?.metricSnapshots[0];
                    return (
                      <tr key={topic.title}>
                        <td>{topic.title}</td>
                        <td>{snapshot?.impressions ?? 0}</td>
                        <td>{snapshot?.ctr ?? 0}</td>
                        <td>
                          <div>{snapshot?.averagePosition ?? 0}</div>
                          <Link href="/recommendations" className="app-inline-link">Open related task</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="app-muted">No persisted monitoring snapshots yet. Run the worker monitoring job.</div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
