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
      <QueueCompose />
      <QueueTable items={items} />
    </section>
  );
}