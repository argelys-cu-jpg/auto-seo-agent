import { PageShell } from "../../components/page-shell";
import { Panel, Badge } from "../../components/cards";
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
    <PageShell title="Optimization Recommendations">
      <Panel title="Refresh Queue">
        <p>
          <Badge>{task.priority}</Badge>
        </p>
        <p><strong>{task.type}</strong></p>
        <p>{task.reason}</p>
        <ul>
          {task.actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
        {tasks.length > 1 ? <p style={{ marginBottom: 0 }}>{tasks.length} total optimization task(s) in queue.</p> : null}
      </Panel>
    </PageShell>
  );
}
