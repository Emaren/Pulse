export type QueueItem = {
  id?: string | number;
  platform?: string;
  status?: string;

  // tolerate both snake_case and camelCase
  scheduled_at?: string | null;
  scheduledAt?: string | null;

  created_at?: string | null;
  createdAt?: string | null;

  projectKey?: string | null;

  // API returns payload_json -> payload (object) with text inside
  payload?: any;

  text?: string | null;
  error?: string | null;
};

type QueueTableProps = {
  items: QueueItem[];
};

function pickTime(item: QueueItem): string {
  return item.scheduledAt ?? item.scheduled_at ?? item.createdAt ?? item.created_at ?? "";
}

function pickText(item: QueueItem): string {
  return item.text ?? item.payload?.text ?? "";
}

export function QueueTable({ items }: QueueTableProps) {
  if (!items || items.length === 0) {
    return <p className="muted" style={{ margin: 0 }}>No queued items.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
      <thead>
        <tr>
          <th align="left">
            When
          </th>
          <th align="left">
            Platform
          </th>
          <th align="left">
            Status
          </th>
          <th align="left">
            Text
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const when = pickTime(item);
          const platform = item.platform ?? "";
          const status = item.status ?? "";
          const text = pickText(item);
          const key = String(item.id ?? idx);

          return (
            <tr key={key}>
              <td style={{ whiteSpace: "nowrap" }}>
                {when || "—"}
              </td>
              <td>
                {platform || "—"}
              </td>
              <td>
                {status || "—"}
              </td>
              <td>
                {text || "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
      </table>
    </div>
  );
}
