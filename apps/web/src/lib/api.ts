const UPSTREAM_API_BASE =
  process.env.PULSE_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE ?? // allow older var name too
  "http://localhost:3390";

export type QueueItem = {
  id: number;
  platform: "x" | "facebook";
  status: string;
  scheduled_at: string;
  payload?: any;
  last_error?: string | null;
};

export type Health = {
  status: string;
  time: string;
};

function resolveUrl(path: string): string {
  // Server-side (RSC): call FastAPI directly
  if (typeof window === "undefined") return `${UPSTREAM_API_BASE}${path}`;

  // Browser: call Next proxy routes (same-origin)
  // /health -> /api/health
  // /queue  -> /api/queue
  return path.startsWith("/api/") ? path : `/api${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {};

  // Only set Content-Type when we're actually sending a body.
  // (Setting it on GET triggers preflight if you ever hit cross-origin.)
  if (init?.body != null && method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(resolveUrl(path), {
    ...init,
    headers: {
      ...headers,
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