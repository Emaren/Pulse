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
    return <p style={{ margin: 0, opacity: 0.7 }}>No queued items.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th align="left" style={{ padding: "8px 6px", borderBottom: "1px solid #ddd" }}>
            When
          </th>
          <th align="left" style={{ padding: "8px 6px", borderBottom: "1px solid #ddd" }}>
            Platform
          </th>
          <th align="left" style={{ padding: "8px 6px", borderBottom: "1px solid #ddd" }}>
            Status
          </th>
          <th align="left" style={{ padding: "8px 6px", borderBottom: "1px solid #ddd" }}>
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
              <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
                {when || "—"}
              </td>
              <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee" }}>
                {platform || "—"}
              </td>
              <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee" }}>
                {status || "—"}
              </td>
              <td style={{ padding: "8px 6px", borderBottom: "1px solid #eee" }}>
                {text || "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}