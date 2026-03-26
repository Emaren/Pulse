"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { AutomationSettings, CadencePreview, CadenceRunResult } from "@/lib/api";

type CadenceAutomationPanelProps = {
  initialPreview: CadencePreview[];
  settings: AutomationSettings;
};

type FeedbackTone = "success" | "error";

function formatWhen(value: string | null | undefined): string {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMix(counts: Record<string, number>): string {
  const pieces = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${kind} ${count}`);
  return pieces.length > 0 ? pieces.join(" · ") : "none yet";
}

function explainReason(reason: string | null | undefined): string {
  switch (reason) {
    case "daily_target_met":
      return "Daily target already met.";
    case "no_approved_drafts":
      return "No approved drafts are waiting for this destination.";
    case "run_limit_reached":
      return "Run limit reached.";
    case "draft_already_allocated":
      return "That draft was already used elsewhere in this run.";
    default:
      return "Ready to queue.";
  }
}

export function CadenceAutomationPanel({ initialPreview, settings }: CadenceAutomationPanelProps) {
  const router = useRouter();
  const [preview, setPreview] = useState(initialPreview);
  const [lastRun, setLastRun] = useState<CadenceRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: FeedbackTone; text: string } | null>(null);

  useEffect(() => {
    setPreview(initialPreview);
  }, [initialPreview]);

  const readyCount = preview.filter((item) => !item.blocked_reason && item.recommended_draft_id).length;
  const blockedCount = preview.length - readyCount;
  const lastRunAt = lastRun?.run_at ?? settings.last_cadence_run_at;

  async function refreshPreview() {
    const response = await fetch("/api/automation/cadence", { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail ?? `Request failed (${response.status})`);
    }
    const payload = (await response.json()) as CadencePreview[];
    setPreview(payload);
  }

  async function handleRunCadence() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/automation/cadence/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      const result = (await response.json()) as CadenceRunResult;
      setLastRun(result);
      setMessage({
        tone: "success",
        text: `Cadence run queued ${result.queued_count} drafts and skipped ${result.skipped_count}.`,
      });
      await refreshPreview();
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not run cadence automation" });
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setBusy(true);
    setMessage(null);

    try {
      await refreshPreview();
      setMessage({ tone: "success", text: "Cadence preview refreshed." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not refresh cadence preview" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">Cadence Planner</div>
          <h2>What Pulse wants to send next</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            This is the first real automation brain. It looks at active destinations, daily targets, quiet hours, recent queue history, and the mix of fresh versus evergreen drafts before it recommends what should move next.
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="btn subtle" onClick={handleRefresh} disabled={busy}>
            Refresh preview
          </button>
          <button type="button" className="btn primary" onClick={handleRunCadence} disabled={busy || readyCount === 0}>
            Run cadence now
          </button>
        </div>
      </div>

      {message ? (
        <section className="status-note" style={{ marginBottom: 16, border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
          <strong>{message.tone === "error" ? "Action blocked" : "Automation update"}</strong>
          <span className="muted">{message.text}</span>
        </section>
      ) : null}

      <div className="metric-grid" style={{ marginBottom: 16 }}>
        <article className="destination-card">
          <div className="metric-label">Ready now</div>
          <div className="metric-value">{readyCount}</div>
          <div className="metric-detail">Destinations that have both room and an approved draft.</div>
        </article>
        <article className="destination-card">
          <div className="metric-label">Blocked</div>
          <div className="metric-value">{blockedCount}</div>
          <div className="metric-detail">Usually daily target pressure or no approved draft waiting.</div>
        </article>
        <article className="destination-card">
          <div className="metric-label">Earliest slot</div>
          <div className="metric-value">{preview[0]?.next_window_at ? formatWhen(preview[0].next_window_at) : "None"}</div>
          <div className="metric-detail">The next scheduled opening Pulse can see from the current plan.</div>
        </article>
        <article className="destination-card">
          <div className="metric-label">Autopilot</div>
          <div className="metric-value">{settings.cadence_enabled ? "armed" : "manual"}</div>
          <div className="metric-detail">
            {settings.cadence_enabled
              ? `Worker checks every ${settings.cadence_interval_minutes} minutes and can queue up to ${settings.cadence_run_limit} drafts per run.`
              : "Manual-only mode. Use Run cadence now or arm autopilot in Settings."}
          </div>
        </article>
      </div>

      <div className="project-meta" style={{ marginBottom: 16 }}>
        <span className="pill">{settings.quiet_hours.length ? settings.quiet_hours.join(" · ") : "No quiet hours"}</span>
        <span className="pill">Last run {formatWhen(lastRunAt)}</span>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        {preview.length === 0 ? (
          <small>No active destinations yet. Add one in Studio before the cadence planner can help.</small>
        ) : (
          preview.map((item) => (
            <article key={item.destination_id} className="draft-card">
              <div className="tag-row">
                <span className="tag">{item.project_slug}</span>
                <span className="tag">{item.platform}</span>
                <span className="tag">{item.cadence_mode}</span>
                <span className="tag">{item.queued_today}/{item.daily_post_target} today</span>
                {item.recommended_draft_kind ? <span className="tag">{item.recommended_draft_kind}</span> : null}
              </div>
              <strong>{item.destination_name}</strong>
              <div className="muted">
                {item.recommended_draft_title ? `Next draft: ${item.recommended_draft_title}` : "No draft selected yet."}
              </div>
              {item.recommended_reason ? <small>{item.recommended_reason}</small> : null}
              <div className="project-meta">
                <span className="pill">{item.eligible_drafts} approved drafts</span>
                <span className="pill">Pool {formatMix(item.eligible_kind_counts)}</span>
                <span className="pill">Recent {formatMix(item.recent_kind_counts)}</span>
                <span className="pill">Next slot {formatWhen(item.next_window_at)}</span>
                <span className="pill">Cooldown {item.cooldown_minutes}m</span>
              </div>
              <small>{explainReason(item.blocked_reason)}</small>
            </article>
          ))
        )}
      </div>

      {lastRun ? (
        <section className="panel" style={{ marginTop: 16, padding: 14 }}>
          <div className="section-head">
            <div>
              <div className="eyebrow">Last Run</div>
              <h3>Most recent cadence action</h3>
            </div>
            <span className="pill">{formatWhen(lastRun.run_at)}</span>
          </div>
          <div className="grid" style={{ gap: 10 }}>
            {lastRun.items.slice(0, 6).map((item) => (
              <article key={`${item.destination_id}:${item.draft_id ?? "none"}`} className="destination-card">
                <div className="tag-row">
                  <span className="tag">{item.status}</span>
                  <span className="tag">{item.project_slug}</span>
                  <span className="tag">{item.platform}</span>
                </div>
                <strong>{item.destination_name}</strong>
                <div className="muted">{item.draft_title ?? "No draft selected"}</div>
                <small>{item.reason ? explainReason(item.reason) : `Scheduled for ${formatWhen(item.scheduled_at)}`}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
