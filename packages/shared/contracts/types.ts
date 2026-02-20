export type QueueStatus = "queued" | "sending" | "sent" | "failed";

export interface QueueItem {
  id: number;
  platform: "x" | "facebook";
  status: QueueStatus;
  scheduled_at: string;
}
