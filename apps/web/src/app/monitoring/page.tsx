import { AutonomousSeoAgent } from "@cookunity-seo-agent/core";
import { PageShell } from "../../components/page-shell";
import { Panel } from "../../components/cards";

export default async function MonitoringPage() {
  const agent = new AutonomousSeoAgent();
  const tasks = await agent.runMonitoring([
    "https://www.cookunity.com/blog/healthy-prepared-meal-delivery-guide",
  ]);

  return (
    <PageShell title="Post-Publish Monitoring">
      <Panel title="Active Signals">
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <strong>{task.type}</strong>: {task.reason}
            </li>
          ))}
        </ul>
      </Panel>
    </PageShell>
  );
}
