import Link from "next/link";

import { PageShell } from "../components/page-shell";
import { getDashboardData } from "../lib/data";

type WorkBucket = {
  id: string;
  title: string;
  pathLabel: string;
  stage: string;
  whyItMatters: string;
  href: string;
  actionLabel: string;
};

function toPathLabel(topicType: string) {
  return topicType === "refresh_existing" ? "Refresh" : "Blog";
}

function mapTopicsToBuckets(topics: Awaited<ReturnType<typeof getDashboardData>>["persistedTopics"]) {
  const needsReview: WorkBucket[] = [];
  const readyToWrite: WorkBucket[] = [];
  const readyToPublish: WorkBucket[] = [];
  const needsRetry: WorkBucket[] = [];

  for (const topic of topics) {
    const hasDraft = topic.drafts.length > 0;
    const hasPublished = topic.publications.some((publication) => publication.status === "published");

    if (topic.workflowState === "revision_requested") {
      needsReview.push({
        id: topic.id,
        title: topic.title,
        pathLabel: toPathLabel(topic.topicType),
        stage: "Needs review",
        whyItMatters: topic.rationale,
        href: `/review?topicId=${encodeURIComponent(topic.id)}`,
        actionLabel: hasDraft ? "Review draft" : "Open in bulk editor",
      });
      continue;
    }

    if (topic.workflowState === "in_review" || topic.workflowState === "approved") {
      needsReview.push({
        id: topic.id,
        title: topic.title,
        pathLabel: toPathLabel(topic.topicType),
        stage: hasDraft ? "Draft ready" : "Brief ready",
        whyItMatters: hasDraft
          ? "The draft exists and needs a human decision."
          : "The brief is approved enough to move into draft review.",
        href: hasDraft ? `/review?topicId=${encodeURIComponent(topic.id)}` : "/grid",
        actionLabel: hasDraft ? "Review draft" : "Open in bulk editor",
      });
      continue;
    }

    if (topic.workflowState === "outline_generated" || topic.workflowState === "queued" || topic.workflowState === "discovered") {
      readyToWrite.push({
        id: topic.id,
        title: topic.title,
        pathLabel: toPathLabel(topic.topicType),
        stage: hasDraft ? "Draft ready" : "Ready to write",
        whyItMatters: topic.rationale,
        href: "/grid",
        actionLabel: hasDraft ? "Open draft" : "Write draft",
      });
      continue;
    }

    if (topic.workflowState === "published" || hasPublished) {
      readyToPublish.push({
        id: topic.id,
        title: topic.title,
        pathLabel: toPathLabel(topic.topicType),
        stage: "Published",
        whyItMatters: "This page is live and belongs in the published inventory or performance review.",
        href: "/published",
        actionLabel: "View page",
      });
      continue;
    }

    if (topic.workflowState === "refresh_recommended") {
      needsRetry.push({
        id: topic.id,
        title: topic.title,
        pathLabel: "Refresh",
        stage: "Needs refresh",
        whyItMatters: topic.rationale,
        href: "/monitoring",
        actionLabel: "Open performance",
      });
      continue;
    }
  }

  return { needsReview, readyToWrite, readyToPublish, needsRetry };
}

function WorkSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: WorkBucket[];
}) {
  return (
    <section className="app-card">
      <div className="app-card-head">
        <div className="app-card-title">{title}</div>
        <div className="app-card-meta">{description}</div>
      </div>
      <div className="app-card-body">
        {items.length ? (
          <div className="app-list">
            {items.map((item) => (
              <div key={item.id} className="app-list-item">
                <div className="app-list-title">
                  <span>{item.title}</span>
                  <span className="app-badge">{item.stage}</span>
                </div>
                <div className="app-list-meta">{item.pathLabel}</div>
                <div className="app-muted">{item.whyItMatters}</div>
                <div>
                  <Link href={item.href} className="app-inline-link">
                    {item.actionLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="app-muted">Nothing needs attention in this section right now.</div>
        )}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const data = await getDashboardData();
  const work = mapTopicsToBuckets(data.persistedTopics);

  return (
    <PageShell
      title="Work"
      description="Start with the items that need action now."
      actions={
        <>
          <Link href="/grid" className="app-button is-primary">
            Open bulk editor
          </Link>
          <Link href="/review" className="app-button">
            Open review
          </Link>
        </>
      }
    >
      <section className="app-grid-sidebar">
        <div className="app-section">
          <WorkSection
            title="Needs review"
            description="Drafts and briefs that need a human decision."
            items={work.needsReview}
          />
          <WorkSection
            title="Ready to write"
            description="Topics that are worth drafting next."
            items={work.readyToWrite}
          />
        </div>

        <div className="app-stack">
          <WorkSection
            title="Ready to publish"
            description="Items that can move forward once review is complete."
            items={work.readyToPublish}
          />
          <WorkSection
            title="Needs retry"
            description="Items that need a rerun, refresh, or operational follow-up."
            items={work.needsRetry}
          />

          <section className="app-card">
            <div className="app-card-head">
              <div className="app-card-title">What the system recommends next</div>
              <div className="app-card-meta">Current priority</div>
            </div>
            <div className="app-card-body app-stack">
              <div style={{ fontWeight: 700 }}>{data.persistedTopics[0]?.title ?? data.draft.h1}</div>
              <div className="app-muted">
                {data.persistedTopics[0]?.rationale ??
                  "Start with the strongest topic in the queue, get the draft into review, and move it forward before widening the pipeline."}
              </div>
              <div>
                <Link href="/review" className="app-inline-link">Review draft</Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </PageShell>
  );
}
