import Link from "next/link";

import { WorkflowGridControlPlane } from "../../components/workflow-grid-control-plane";
import { getGridControlPlaneData } from "../../lib/workflow-grid-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const workspaces = [
  { key: "general", label: "General", title: "Bulk editor", description: "Add, edit, remove, and run topics in one place." },
  { key: "diets", label: "Diets", title: "Diet bulk editor", description: "Manage diet pages, supporting blog articles, and diet comparison work." },
  { key: "cuisines", label: "Cuisines", title: "Cuisine bulk editor", description: "Manage cuisine pages, cuisine education, and regional meal discovery work." },
  { key: "brand-holidays", label: "Brand/Holidays", title: "Brand and holiday bulk editor", description: "Manage seasonal campaigns, holiday pages, and brand-adjacent organic work." },
  { key: "occasions", label: "Occasions", title: "Occasion bulk editor", description: "Manage occasion-based content and event-driven landing pages." },
  { key: "campaigns", label: "Campaigns", title: "Campaign bulk editor", description: "Manage strategic campaign work and conversion-focused page creation." },
] as const;

export default async function WorkflowGridPage({
  searchParams,
}: {
  searchParams?: Promise<{ workspace?: string; selected?: string; review?: string }>;
}) {
  const data = await getGridControlPlaneData();
  const params = searchParams ? await searchParams : undefined;
  const workspace = workspaces.find((item) => item.key === params?.workspace) ?? workspaces[0]!;
  const initialSelectedId = params?.selected ?? params?.review ?? null;

  return (
    <div className="airops-shell">
      <aside className="airops-rail">
        <Link href="/" className="airops-rail-logo" aria-label="Back to work">⌂</Link>
        <Link href="/grid" className="airops-rail-button" aria-label="Bulk editor">⊞</Link>
        <Link href="/review" className="airops-rail-button" aria-label="Review">✓</Link>
        <Link href="/published" className="airops-rail-button" aria-label="Published">◌</Link>
        <Link href="/monitoring" className="airops-rail-button" aria-label="Performance">↗</Link>
        <div style={{ flex: 1 }} />
        <Link href="/agents" className="airops-rail-button" aria-label="System activity">⚙</Link>
      </aside>
      <main className="airops-main">
        <header className="airops-topbar">
          <div className="airops-titlebar">
            <Link href="/" className="airops-back" aria-label="Back to work">←</Link>
            <div className="airops-green-dot" />
            <div className="airops-title">{workspace.title}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/" className="airops-tool">Work</Link>
            <Link href="/review" className="airops-tool">Review</Link>
          </div>
        </header>
        <div className="airops-subnav">
          {workspaces.map((item) => (
            <Link
              key={item.key}
              href={`/grid?workspace=${item.key}`}
              className={`airops-tab${item.key === workspace.key ? " is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="airops-toolbar">
          <div className="airops-tool">Add topics and run work in bulk</div>
          <div className="airops-spacer" />
          <Link href="/review" className="airops-tool">Open review</Link>
          <Link href="/published" className="airops-tool">Published</Link>
        </div>
        <div className="airops-canvas">
          <WorkflowGridControlPlane
            initialRows={data.rows}
            persistenceMode={data.persistenceMode}
            databaseReady={data.databaseReady}
            ahrefsMode={data.ahrefsMode}
            workspaceKey={workspace.key}
            workspaceTitle={workspace.title}
            workspaceDescription={workspace.description}
            initialSelectedId={initialSelectedId}
          />
        </div>
      </main>
    </div>
  );
}
