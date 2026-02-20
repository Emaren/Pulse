import { getHealth, getQueue } from "@/lib/api";
import { QueueTable, type QueueItem } from "@/components/QueueTable";

export default async function DashboardPage() {
  let status = "offline";
  let queue: QueueItem[] = [];

  try {
    const health = await getHealth();
    status = health.status;
    queue = (await getQueue()) as QueueItem[];
  } catch {
    // Keep page renderable even when API is down.
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h2>System status</h2>
        <p style={{ margin: 0 }}>
          API: <strong>{status}</strong>
        </p>
      </div>
      <div>
        <h2>Queue Snapshot</h2>
        <QueueTable items={queue} />
      </div>
    </section>
  );
}
