import Link from "next/link";

import { PageShell } from "../../components/page-shell";
import { getDashboardData, type PerformanceActionItem } from "../../lib/data";

function ActionSection(props: {
  title: string;
  description: string;
  items: PerformanceActionItem[];
  empty: string;
}) {
  return (
    <section className="app-card">
      <div className="app-card-head">
        <div>
          <div className="app-card-title">{props.title}</div>
          <div className="app-card-meta">{props.description}</div>
        </div>
      </div>
      <div className="app-card-body">
        {props.items.length ? (
          <div className="app-list">
            {props.items.map((item) => (
              <div key={item.id} className="app-list-item">
                <div className="app-list-title">
                  <span>{item.title}</span>
                  <span className="app-badge is-warning">{item.signal}</span>
                </div>
                <div className="app-muted">{item.summary}</div>
                <div>
                  <Link href={item.href} className="app-inline-link">
                    {item.actionLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="app-muted">{props.empty}</div>
        )}
      </div>
    </section>
  );
}

export default async function MonitoringPage() {
  const data = await getDashboardData();

  return (
    <PageShell
      title="Performance"
      description="Find pages that need an update and move directly into the next action."
      actions={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/recommendations" className="app-button">
            Open refresh tasks
          </Link>
          <Link href="/published" className="app-button is-primary">
            Open published pages
          </Link>
        </div>
      }
    >
      <div className="app-grid-2">
        <ActionSection
          title="Losing traction"
          description="Pages that need a refresh before rankings slip further."
          items={data.performanceActions.losingTraction}
          empty="No published pages are currently showing meaningful ranking or click decline."
        />
        <ActionSection
          title="Low CTR"
          description="Pages getting seen but not chosen."
          items={data.performanceActions.lowCtr}
          empty="No pages currently need a title-tag or CTR rewrite."
        />
        <ActionSection
          title="Ready for refresh"
          description="Pages that already have a clear refresh path."
          items={data.performanceActions.readyForRefresh}
          empty="No refresh-ready pages are queued right now."
        />
        <ActionSection
          title="Weak conversion"
          description="Pages with visibility but weak downstream action."
          items={data.performanceActions.weakConversion}
          empty="No published pages currently need a CTA-focused review."
        />
      </div>
    </PageShell>
  );
}
