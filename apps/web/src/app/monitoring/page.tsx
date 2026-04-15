import { PageShell } from "../../components/page-shell";
import { Panel } from "../../components/cards";
import { getDashboardData } from "../../lib/data";

export default async function MonitoringPage() {
  const data = await getDashboardData();
  const monitored = data.persistedTopics.filter((topic) => topic.publications[0]?.metricSnapshots.length);

  return (
    <PageShell title="Post-Publish Monitoring">
      <Panel title="Active Signals">
        {monitored.length ? (
          <ul>
            {monitored.map((topic) => {
              const snapshot = topic.publications[0]?.metricSnapshots[0];
              return (
                <li key={topic.title}>
                  <strong>{topic.title}</strong>: impressions {snapshot?.impressions ?? 0}, CTR {snapshot?.ctr ?? 0}, avg position {snapshot?.averagePosition ?? 0}
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={{ marginBottom: 0 }}>No persisted monitoring snapshots yet. Run the worker monitoring job.</p>
        )}
      </Panel>
    </PageShell>
  );
}
