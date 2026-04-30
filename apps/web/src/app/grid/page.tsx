import Link from "next/link";

import { PageShell } from "../../components/page-shell";
import { WorkflowGridControlPlane } from "../../components/workflow-grid-control-plane";
import { getGridControlPlaneData } from "../../lib/workflow-grid-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const workspaces = [
  { key: "general", label: "General", title: "Pipeline", description: "Plan, produce, publish, and improve content in one place." },
  { key: "diets", label: "Diets", title: "Diet pipeline", description: "Manage diet pages, supporting blog articles, and diet comparison work." },
  { key: "cuisines", label: "Cuisines", title: "Cuisine pipeline", description: "Manage cuisine pages, cuisine education, and regional meal discovery work." },
  { key: "brand-holidays", label: "Brand/Holidays", title: "Brand and holiday pipeline", description: "Manage seasonal campaigns, holiday pages, and brand-adjacent organic work." },
  { key: "occasions", label: "Occasions", title: "Occasion pipeline", description: "Manage occasion-based content and event-driven landing pages." },
  { key: "campaigns", label: "Campaigns", title: "Campaign pipeline", description: "Manage strategic campaign work and conversion-focused page creation." },
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
    <PageShell
      title="Pipeline"
      description="Plan, produce, publish, and improve content that moves organic trials."
      actions={(
        <>
          <Link href="/review" className="app-button">Review drafts</Link>
          <Link href="/published" className="app-button">Published</Link>
        </>
      )}
    >
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
    </PageShell>
  );
}
