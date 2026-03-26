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

export type CadencePreview = {
  destination_id: number;
  project_id: number;
  project_slug: string;
  project_name: string;
  destination_name: string;
  platform: "x" | "facebook";
  cadence_mode: string;
  daily_post_target: number;
  queued_today: number;
  cooldown_minutes: number;
  cooldown_until?: string | null;
  next_window_at?: string | null;
  eligible_drafts: number;
  recommended_draft_id?: number | null;
  recommended_draft_title?: string | null;
  blocked_reason?: string | null;
};

export type CadenceRunItem = {
  destination_id: number;
  project_slug: string;
  destination_name: string;
  platform: "x" | "facebook";
  draft_id?: number | null;
  draft_title?: string | null;
  scheduled_at?: string | null;
  status: "queued" | "skipped";
  reason?: string | null;
};

export type CadenceRunResult = {
  run_at: string;
  queued_count: number;
  skipped_count: number;
  items: CadenceRunItem[];
};

export type AutomationSettings = {
  cadence_enabled: boolean;
  cadence_interval_minutes: number;
  cadence_run_limit: number;
  quiet_hours: string[];
  last_cadence_run_at?: string | null;
};

export type Project = {
  id: number;
  slug: string;
  name: string;
  website_url: string;
  tone: string;
  tags: string[];
  active: boolean;
};

export type Template = {
  id: number;
  platform: "x" | "facebook";
  name: string;
  body: string;
  is_active: boolean;
};

export type Destination = {
  id: number;
  project_slug: string;
  platform: "x" | "facebook";
  name: string;
  external_ref?: string | null;
  timezone: string;
  cadence_mode: "gentle" | "normal" | "aggressive" | "launch" | "quiet";
  daily_post_target: number;
  windows: string[];
  requires_approval: boolean;
  active: boolean;
};

export type Draft = {
  id: number;
  project_id: number;
  project_slug: string;
  destination_id?: number | null;
  destination_name?: string | null;
  platform?: string | null;
  title: string;
  body: string;
  source_type: string;
  kind: string;
  status: string;
  priority: number;
  source_ref?: string | null;
  notes: Record<string, unknown>;
  approved_at?: string | null;
  queued_at?: string | null;
  published_at?: string | null;
  scheduled_for?: string | null;
  published_queue_id?: number | null;
  created_at: string;
  updated_at: string;
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

export function getCadencePreview(projectSlug?: string): Promise<CadencePreview[]> {
  const search = projectSlug ? `?project_slug=${encodeURIComponent(projectSlug)}` : "";
  return request<CadencePreview[]>(`/automation/cadence${search}`);
}

export function getAutomationSettings(): Promise<AutomationSettings> {
  return request<AutomationSettings>("/automation/settings");
}

export function getProjects(): Promise<Project[]> {
  return request<Project[]>("/projects");
}

export function getDestinations(): Promise<Destination[]> {
  return request<Destination[]>("/destinations");
}

export function getTemplates(): Promise<Template[]> {
  return request<Template[]>("/templates");
}

export function getDrafts(status?: string): Promise<Draft[]> {
  const search = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<Draft[]>(`/drafts${search}`);
}

export function getQueue(): Promise<QueueItem[]> {
  return request<QueueItem[]>("/queue");
}
