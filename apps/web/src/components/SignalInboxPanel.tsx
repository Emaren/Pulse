"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ContextSignal } from "@/lib/api";

type SignalInboxPanelProps = {
  initialSignals: ContextSignal[];
};

type FeedbackTone = "success" | "error";

function formatWhen(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function SignalInboxPanel({ initialSignals }: SignalInboxPanelProps) {
  const router = useRouter();
  const [signals, setSignals] = useState(initialSignals);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: FeedbackTone; text: string } | null>(null);

  useEffect(() => {
    setSignals(initialSignals);
  }, [initialSignals]);

  const draftedCount = signals.filter((signal) => signal.status === "drafted").length;
  const pendingCount = signals.filter((signal) => signal.status === "received").length;

  async function refreshSignals() {
    const response = await fetch("/api/signals", { cache: "no-store" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail ?? `Request failed (${response.status})`);
    }
    const payload = (await response.json()) as ContextSignal[];
    setSignals(payload);
  }

  async function handleRefresh() {
    setBusyKey("refresh");
    setMessage(null);

    try {
      await refreshSignals();
      setMessage({ tone: "success", text: "Observation inbox refreshed." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not refresh observations" });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateDraft(signalId: number) {
    setBusyKey(`draft:${signalId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/signals/${signalId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      const updated = (await response.json()) as ContextSignal;
      setSignals((current) => current.map((signal) => (signal.id === updated.id ? updated : signal)));
      setMessage({ tone: "success", text: "Signal turned into a reviewable draft." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not create draft from signal" });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">Observation Inbox</div>
          <h2>What outside systems have noticed lately</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            In plain English: this is where `full-context-all` and future watchers can drop trustworthy changes. Pulse fingerprints them, avoids duplicates, and remembers whether each one already became a draft.
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="btn subtle" onClick={handleRefresh} disabled={busyKey !== null}>
            Refresh inbox
          </button>
        </div>
      </div>

      {message ? (
        <section className="status-note" style={{ marginBottom: 16, border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
          <strong>{message.tone === "error" ? "Action blocked" : "Inbox updated"}</strong>
          <span className="muted">{message.text}</span>
        </section>
      ) : null}

      <div className="metric-grid" style={{ marginBottom: 16 }}>
        <article className="destination-card">
          <div className="metric-label">Observed signals</div>
          <div className="metric-value">{signals.length}</div>
          <div className="metric-detail">Recent cross-system updates Pulse has accepted.</div>
        </article>
        <article className="destination-card">
          <div className="metric-label">Drafted</div>
          <div className="metric-value">{draftedCount}</div>
          <div className="metric-detail">Signals already turned into reviewable posts.</div>
        </article>
        <article className="destination-card">
          <div className="metric-label">Pending</div>
          <div className="metric-value">{pendingCount}</div>
          <div className="metric-detail">Signals still waiting for a human-triggered draft pass.</div>
        </article>
        <article className="destination-card">
          <div className="metric-label">Deduped path</div>
          <div className="metric-value">on</div>
          <div className="metric-detail">The same observation should not create repeated inbox noise.</div>
        </article>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        {signals.length === 0 ? (
          <small>No observations have landed yet. The manual Context Intake panel still works today, and `POST /signals/ingest` is now ready for the automated bridge.</small>
        ) : (
          signals.map((signal) => (
            <article key={signal.id} className="draft-card">
              <div className="tag-row">
                <span className="tag">{signal.project_slug}</span>
                <span className="tag">{signal.platform}</span>
                <span className="tag">{signal.status}</span>
                <span className="tag">{signal.template_name}</span>
              </div>
              <strong>{signal.title ?? "Untitled observation"}</strong>
              <div className="muted">{signal.change_summary.length > 220 ? `${signal.change_summary.slice(0, 219)}…` : signal.change_summary}</div>
              <div className="project-meta">
                <span className="pill">{signal.destination_name ?? "No destination resolved yet"}</span>
                <span className="pill">Observed {formatWhen(signal.observed_at ?? signal.created_at)}</span>
                <span className="pill">{signal.source_ref ?? "No source ref"}</span>
              </div>
              <div className="button-row">
                {signal.draft_id ? (
                  <button type="button" className="btn subtle" onClick={() => router.push("/studio")} disabled={busyKey !== null}>
                    Open draft inbox
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => handleCreateDraft(signal.id)}
                    disabled={busyKey !== null}
                  >
                    Create draft now
                  </button>
                )}
                <small>{signal.draft_title ? `Draft: ${signal.draft_title}` : "No draft created yet."}</small>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
