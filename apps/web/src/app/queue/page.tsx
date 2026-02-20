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
    <section>
      <h2>Queue</h2>
      <QueueTable items={items} />
    </section>
  );
}
