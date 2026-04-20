import { WorkflowGridControlPlane } from "../../components/workflow-grid-control-plane";
import { getGridControlPlaneData } from "../../lib/workflow-grid-store";

export default async function WorkflowGridPage() {
  const data = await getGridControlPlaneData();

  return (
    <div className="airops-shell">
      <aside className="airops-rail">
        <div className="airops-rail-logo">✕</div>
        <div className="airops-rail-button">＋</div>
        <div className="airops-rail-button">⌂</div>
        <div className="airops-rail-button">⌕</div>
        <div className="airops-rail-button">⌘</div>
        <div className="airops-rail-button">☆</div>
        <div className="airops-rail-button">◌</div>
        <div style={{ flex: 1 }} />
        <div className="airops-rail-button">⚙</div>
      </aside>
      <main className="airops-main">
        <header className="airops-topbar">
          <div className="airops-titlebar">
            <div className="airops-back">←</div>
            <div className="airops-green-dot" />
            <div className="airops-title">CookUnity SEO workflows</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="airops-tool">Search</div>
            <div className="airops-tool">Share</div>
          </div>
        </header>
        <div className="airops-subnav">
          <div className="airops-tab">Blank</div>
          <div className="airops-tab">GW Playground</div>
          <div className="airops-tab is-active">Diets</div>
          <div className="airops-tab">Cuisines</div>
          <div className="airops-tab">Brand/Holidays</div>
          <div className="airops-tab">Occasions</div>
          <div className="airops-tab">Campaigns</div>
          <div className="airops-tab">+</div>
        </div>
        <div className="airops-toolbar">
          <div className="airops-tool">Filter</div>
          <div className="airops-tool">Sort</div>
          <div className="airops-tool">Freeze Columns</div>
          <div className="airops-tool">Row Height</div>
          <div className="airops-tool">Export CSV</div>
          <div className="airops-tool">Import CSV</div>
          <div className="airops-spacer" />
          <div className="airops-tool">Add Column</div>
          <div className="airops-tool airops-primary">Add Workflow</div>
        </div>
        <div className="airops-canvas">
          <WorkflowGridControlPlane
            initialRows={data.rows}
            persistenceMode={data.persistenceMode}
            databaseReady={data.databaseReady}
          />
        </div>
      </main>
    </div>
  );
}
