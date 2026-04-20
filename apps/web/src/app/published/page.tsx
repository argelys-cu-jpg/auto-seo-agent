import { PageShell } from "../../components/page-shell";
import { getDashboardData } from "../../lib/data";

export default async function PublishedPage() {
  const data = await getDashboardData();

  return (
    <PageShell
      title="Published inventory"
      description="Every published article, status, and CMS record in one place."
    >
      <section className="app-card">
        <div className="app-card-head">
          <div className="app-card-title">Published content</div>
          <div className="app-card-meta">{data.publishedInventory.length} records</div>
        </div>
        <div className="app-card-body">
          <div className="app-table-shell">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.publishedInventory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.slug}</td>
                    <td>{item.title}</td>
                    <td><span className="app-badge is-success">{item.status}</span></td>
                  </tr>
                ))}
                {data.publishedInventory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="app-muted">No published records yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
