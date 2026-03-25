import { getDestinations, getDrafts, getHealth, getQueue } from "@/lib/api";
import { builderStatus } from "@/lib/builder-status";
import { QueueTable, type QueueItem } from "@/components/QueueTable";

export default async function DashboardPage() {
  let status = "offline";
  let queue: QueueItem[] = [];
  let destinationCount = 0;
  let draftCount = 0;
  let approvalCount = 0;
  let queuedDraftCount = 0;

  try {
    const health = await getHealth();
    status = health.status;
    queue = (await getQueue()) as QueueItem[];
    const [destinations, drafts] = await Promise.all([getDestinations(), getDrafts()]);
    destinationCount = destinations.length;
    draftCount = drafts.length;
    approvalCount = drafts.filter((draft) => draft.status === "approved").length;
    queuedDraftCount = drafts.filter((draft) => draft.status === "queued").length;
  } catch {
    // Keep page renderable even when API is down.
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <div className="grid two">
        <article className="panel">
          <h2>Builder Version</h2>
          <p style={{ marginBottom: 6 }}>
            Pulse is at <strong>{builderStatus.overall.toFixed(2)} / {builderStatus.target.toFixed(2)}</strong>
          </p>
          <small>{builderStatus.stageLabel}</small>
        </article>
        <article className="panel">
          <h2>System status</h2>
          <p style={{ marginBottom: 6 }}>
            API: <strong>{status}</strong>
          </p>
          <small>The execution lane is still alive while the control tower grows around it.</small>
        </article>
        <article className="panel">
          <h2>Destinations</h2>
          <p style={{ marginBottom: 6 }}>
            <strong>{destinationCount}</strong> publishing destinations configured
          </p>
          <small>These are the project pages/accounts that speak for the brand.</small>
        </article>
        <article className="panel">
          <h2>Draft Library</h2>
          <p style={{ marginBottom: 6 }}>
            <strong>{draftCount}</strong> drafts, <strong>{approvalCount}</strong> approved, <strong>{queuedDraftCount}</strong> queued
          </p>
          <small>Drafts now exist before they are sent, which is the first big shift away from queue-first behavior.</small>
        </article>
      </div>

      <div>
        <h2>Module Progress</h2>
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
      </div>

      <div>
        <h2>Queue Snapshot</h2>
        <QueueTable items={queue} />
      </div>
    </section>
  );
}
