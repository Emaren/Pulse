const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ?? // allow older var name too
  "http://localhost:3390";

export type QueueItem = {
  id: number;
  platform: "x" | "facebook";
  status: string;
  scheduled_at: string;
};

export type Health = {
  status: string;
  time: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getHealth(): Promise<Health> {
  return request<Health>("/health");
}

export function getQueue(): Promise<QueueItem[]> {
  return request<QueueItem[]>("/queue");
}
