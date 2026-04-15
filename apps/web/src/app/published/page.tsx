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
            <tr style={{ borderTop: "1px solid #eadfce" }}>
              <td>{data.draft.slugRecommendation}</td>
              <td>{data.draft.h1}</td>
              <td>published</td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </PageShell>
  );
}
