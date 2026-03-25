import { QueueCompose } from "@/components/QueueCompose";
import { QueueTable, type QueueItem } from "@/components/QueueTable";
import { getQueue } from "@/lib/api";

export default async function QueuePage() {
  let items: QueueItem[] = [];

  try {
    items = (await getQueue()) as QueueItem[];
  } catch {
    // Render empty state when API is unavailable.
  }

  return (
    <section className="grid" style={{ gap: 16 }}>
      <h2>Queue</h2>
      <p style={{ marginTop: 0, marginBottom: 0 }}>
        This is the execution lane. The new authoring lane now lives in Studio, and approved drafts flow into this queue when they are ready to ship.
      </p>
      <QueueCompose />
      <QueueTable items={items} />
    </section>
  );
}
