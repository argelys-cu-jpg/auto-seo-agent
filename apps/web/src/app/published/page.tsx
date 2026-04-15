import { PageShell } from "../../components/page-shell";
import { Panel } from "../../components/cards";
import { getDashboardData } from "../../lib/data";

export default async function PublishedPage() {
  const data = await getDashboardData();

  return (
    <PageShell title="Published Content">
      <Panel title="Published Inventory">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Slug</th>
              <th>Title</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.publishedInventory.map((item) => (
              <tr key={item.id} style={{ borderTop: "1px solid #eadfce" }}>
                <td>{item.slug}</td>
                <td>{item.title}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.publishedInventory.length === 0 ? <p style={{ marginBottom: 0 }}>No published records yet.</p> : null}
      </Panel>
    </PageShell>
  );
}
