import Link from "next/link";

import { PageShell } from "../../components/page-shell";
import { getDashboardData } from "../../lib/data";

export default async function RecommendationsPage() {
  const data = await getDashboardData();
  const tasks = data.persistedTopics.flatMap((topic) =>
    (topic.publications[0]?.optimizationTasks ?? []).map((task) => ({
      ...task,
      title: topic.title,
    })),
  );
  const task = tasks[0] ?? data.optimizationTask;

  return (
    <PageShell
      title="Refresh tasks"
      description="Optimization work created from live monitoring, decay detection, and cluster gaps."
      actions={<Link href="/monitoring" className="app-button is-primary">Back to monitoring</Link>}
    >
      <section className="app-grid-sidebar">
        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Current recommendation</div>
            <div className="app-card-meta">{tasks.length > 1 ? `${tasks.length} tasks in queue` : "Single active task"}</div>
          </div>
          <div className="app-card-body app-stack">
            <div><span className="app-badge is-warning">{task.priority}</span></div>
            <div style={{ fontWeight: 600 }}>{task.type}</div>
            <div className="app-muted">{task.reason}</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {task.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="app-card">
          <div className="app-card-head">
            <div className="app-card-title">Task intent</div>
          </div>
          <div className="app-card-body app-stack">
            <div className="app-muted">Refresh work is generated after publication, not during drafting. The queue exists to improve live pages, not to create new content from scratch.</div>
            <Link href="/grid" className="app-inline-link">Open workflow grid</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
