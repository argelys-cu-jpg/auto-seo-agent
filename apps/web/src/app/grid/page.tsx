import Link from "next/link";

import { WorkflowGridControlPlane } from "../../components/workflow-grid-control-plane";
import { getGridControlPlaneData } from "../../lib/workflow-grid-store";

const workspaces = [
  { key: "blank", label: "Blank", title: "Blank workflow grid", description: "A general-purpose workspace for new opportunities." },
  { key: "diets", label: "Diets", title: "Diet workflow grid", description: "SEO workflows for diet pages, comparison pages, and related blog support." },
  { key: "cuisines", label: "Cuisines", title: "Cuisine workflow grid", description: "SEO workflows for cuisine pages, cuisine education, and regional meal discovery." },
  { key: "brand-holidays", label: "Brand/Holidays", title: "Brand and holiday workflow grid", description: "Seasonal campaigns, holiday pages, and brand-adjacent organic work." },
  { key: "occasions", label: "Occasions", title: "Occasions workflow grid", description: "Occasion-based meal delivery workflows and event-driven landing pages." },
  { key: "campaigns", label: "Campaigns", title: "Campaign workflow grid", description: "Dedicated grids for conversion campaigns and strategic growth pushes." },
] as const;

export default async function WorkflowGridPage({
  searchParams,
}: {
  searchParams?: Promise<{ workspace?: string }>;
}) {
  const data = await getGridControlPlaneData();
  const params = searchParams ? await searchParams : undefined;
  const workspace = workspaces.find((item) => item.key === params?.workspace) ?? workspaces[1]!;

  return (
    <div className="airops-shell">
      <aside className="airops-rail">
        <Link href="/" className="airops-rail-logo" aria-label="Close grid">✕</Link>
        <Link href={`/grid?workspace=${workspace.key}`} className="airops-rail-button" aria-label="New row">＋</Link>
        <Link href="/" className="airops-rail-button" aria-label="Home">⌂</Link>
        <Link href="/opportunities" className="airops-rail-button" aria-label="Search opportunities">⌕</Link>
        <Link href="/grid" className="airops-rail-button" aria-label="Workflow grid">⌘</Link>
        <Link href="/review" className="airops-rail-button" aria-label="Review queue">☆</Link>
        <Link href="/published" className="airops-rail-button" aria-label="Published">◌</Link>
        <div style={{ flex: 1 }} />
        <Link href="/agents" className="airops-rail-button" aria-label="Settings and agents">⚙</Link>
      </aside>
      <main className="airops-main">
        <header className="airops-topbar">
          <div className="airops-titlebar">
            <Link href="/" className="airops-back" aria-label="Back to overview">←</Link>
            <div className="airops-green-dot" />
            <div className="airops-title">{workspace.title}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/opportunities" className="airops-tool">Search</Link>
            <Link href="/inbox" className="airops-tool">Inbox</Link>
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
          <Link href="/opportunities" className="airops-tool">Filter</Link>
          <Link href="/opportunities" className="airops-tool">Sort</Link>
          <div className="airops-tool">Freeze Columns</div>
          <div className="airops-tool">Row Height</div>
          <Link href="/published" className="airops-tool">Export CSV</Link>
          <Link href="/inbox" className="airops-tool">Import CSV</Link>
          <div className="airops-spacer" />
          <Link href={`/grid?workspace=${workspace.key}`} className="airops-tool">Add Column</Link>
          <Link href={`/grid?workspace=blank`} className="airops-tool airops-primary">Add Workflow</Link>
        </div>
        <div className="airops-canvas">
          <WorkflowGridControlPlane
            initialRows={data.rows}
            persistenceMode={data.persistenceMode}
            databaseReady={data.databaseReady}
            workspaceKey={workspace.key}
            workspaceTitle={workspace.title}
            workspaceDescription={workspace.description}
          />
        </div>
      </main>
    </div>
  );
}
