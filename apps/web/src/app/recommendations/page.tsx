import { PageShell } from "../../components/page-shell";
import { Panel, Badge } from "../../components/cards";
import { getDashboardData } from "../../lib/data";

export default async function RecommendationsPage() {
  const data = await getDashboardData();
  const task = data.optimizationTask;

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
      </Panel>
    </PageShell>
  );
}
