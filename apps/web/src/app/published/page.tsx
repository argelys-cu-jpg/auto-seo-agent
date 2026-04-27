import Link from "next/link";

import { PageShell } from "../../components/page-shell";
import { PublishedSearchWorkspace } from "../../components/published-search-workspace";
import { getDashboardData } from "../../lib/data";

export default async function PublishedPage() {
  const data = await getDashboardData();

  return (
    <PageShell
      title="Published inventory"
      description="Every published article, status, and CMS record in one place."
      actions={<Link href="/monitoring" className="app-button is-primary">Open monitoring</Link>}
    >
      <PublishedSearchWorkspace items={data.publishedInventory} />
    </PageShell>
  );
}
