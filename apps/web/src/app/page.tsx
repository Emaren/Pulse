import Link from "next/link";

import { getDestinations, getDrafts, getHealth, getQueue, type Draft } from "@/lib/api";
import { builderStatus } from "@/lib/builder-status";
import { QueueTable, type QueueItem } from "@/components/QueueTable";

export default async function DashboardPage() {
  let status = "offline";
  let queue: QueueItem[] = [];
  let drafts: Draft[] = [];
  let destinationCount = 0;
  let draftCount = 0;
  let approvalCount = 0;
  let queuedDraftCount = 0;

  try {
    const health = await getHealth();
    status = health.status;
    queue = (await getQueue()) as QueueItem[];
    const [destinations, loadedDrafts] = await Promise.all([getDestinations(), getDrafts()]);
    destinationCount = destinations.length;
    drafts = loadedDrafts;
    draftCount = drafts.length;
    approvalCount = drafts.filter((draft) => draft.status === "approved").length;
    queuedDraftCount = drafts.filter((draft) => draft.status === "queued").length;
  } catch {
    // Keep page renderable even when API is down.
  }

  const draftStats = [
    {
      label: "Awaiting review",
      value: drafts.filter((draft) => draft.status === "draft").length,
      detail: "New drafts still waiting for your eyes.",
    },
    {
      label: "Needs attention",
      value: drafts.filter((draft) => draft.status === "needs_attention").length,
      detail: "Posts blocked for cleanup or a stronger human pass.",
    },
    {
      label: "Approved",
      value: approvalCount,
      detail: "Ready to move into the real queue.",
    },
    {
      label: "Published",
      value: drafts.filter((draft) => draft.status === "published").length,
      detail: "Already pushed through the delivery lane.",
    },
  ];

  const recentDrafts = drafts.slice(0, 4);

  return (
    <section className="grid" style={{ gap: 16 }}>
      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">At a Glance</div>
            <h2>Pulse Builder Status</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              In plain English: this dashboard now tracks the control tower, not just the queue.
            </p>
          </div>
          <div className="quick-links">
            <Link href="/studio" className="btn-link primary">
              Open Studio
            </Link>
            <Link href="/queue" className="btn-link subtle">
              Open Queue
            </Link>
            <Link href="/projects" className="btn-link">
              View Projects
            </Link>
          </div>
        </div>

        <div className="metric-grid">
          <article className="metric-card">
            <span className="metric-label">Builder version</span>
            <span className="metric-value">
              {builderStatus.overall.toFixed(2)} / {builderStatus.target.toFixed(2)}
            </span>
            <span className="metric-detail">{builderStatus.stageLabel}</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">System status</span>
            <span className="metric-value">{status}</span>
            <span className="metric-detail">The execution lane is still alive while the control tower grows around it.</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Destinations</span>
            <span className="metric-value">{destinationCount}</span>
            <span className="metric-detail">Publishing identities currently configured.</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Draft library</span>
            <span className="metric-value">{draftCount}</span>
            <span className="metric-detail">{approvalCount} approved and {queuedDraftCount} already queued.</span>
          </article>
        </div>
      </section>

      <div className="grid two">
        <section className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Approval Inbox</div>
              <h2>Lane Snapshot</h2>
            </div>
            <span className="pill">{draftCount} drafts total</span>
          </div>
          <div className="metric-grid">
            {draftStats.map((stat) => (
              <article key={stat.label} className="destination-card">
                <div className="metric-label">{stat.label}</div>
                <div className="metric-value">{stat.value}</div>
                <div className="metric-detail">{stat.detail}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">Recent Drafts</div>
              <h2>Newest activity</h2>
            </div>
            <Link href="/studio" className="btn-link">
              Manage Inbox
            </Link>
          </div>
          {recentDrafts.length === 0 ? (
            <small>No drafts yet. The Studio page is ready for the first destination and draft.</small>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {recentDrafts.map((draft) => (
                <article key={draft.id} className="draft-card">
                  <div className="tag-row">
                    <span className="tag">{draft.project_slug}</span>
                    <span className="tag">{draft.status}</span>
                  </div>
                  <strong>{draft.title}</strong>
                  <div className="muted">{draft.body.length > 180 ? `${draft.body.slice(0, 179)}…` : draft.body}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Module Progress</div>
            <h2>How close each layer is to the target</h2>
          </div>
        </div>
        <div className="grid two">
          {builderStatus.modules.map((module) => (
            <article key={module.label} className="panel">
              <h3>{module.label}</h3>
              <p style={{ marginBottom: 6 }}>
                <strong>{module.score.toFixed(2)} / 1.00</strong>
              </p>
              <small>{module.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Execution Lane</div>
            <h2>Queue Snapshot</h2>
          </div>
        </div>
        <QueueTable items={queue} />
      </section>
    </section>
  );
}
