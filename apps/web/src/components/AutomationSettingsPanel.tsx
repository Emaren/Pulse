"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AutomationSettings } from "@/lib/api";

type AutomationSettingsPanelProps = {
  initialSettings: AutomationSettings;
};

type FeedbackTone = "success" | "error";

function formatWhen(value: string | null | undefined): string {
  if (!value) return "No cadence run recorded yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AutomationSettingsPanel({ initialSettings }: AutomationSettingsPanelProps) {
  const router = useRouter();
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [cadenceEnabled, setCadenceEnabled] = useState(initialSettings.cadence_enabled);
  const [cadenceIntervalMinutes, setCadenceIntervalMinutes] = useState(String(initialSettings.cadence_interval_minutes));
  const [cadenceRunLimit, setCadenceRunLimit] = useState(String(initialSettings.cadence_run_limit));
  const [quietHoursText, setQuietHoursText] = useState(initialSettings.quiet_hours.join(", "));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: FeedbackTone; text: string } | null>(null);

  useEffect(() => {
    setSavedSettings(initialSettings);
    setCadenceEnabled(initialSettings.cadence_enabled);
    setCadenceIntervalMinutes(String(initialSettings.cadence_interval_minutes));
    setCadenceRunLimit(String(initialSettings.cadence_run_limit));
    setQuietHoursText(initialSettings.quiet_hours.join(", "));
  }, [initialSettings]);

  const quietHours = useMemo(
    () =>
      quietHoursText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [quietHoursText]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/automation/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cadence_enabled: cadenceEnabled,
          cadence_interval_minutes: Number(cadenceIntervalMinutes || 30),
          cadence_run_limit: Number(cadenceRunLimit || 6),
          quiet_hours: quietHours,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail ?? `Request failed (${response.status})`);
      }

      const saved = (await response.json()) as AutomationSettings;
      setSavedSettings(saved);
      setCadenceEnabled(saved.cadence_enabled);
      setCadenceIntervalMinutes(String(saved.cadence_interval_minutes));
      setCadenceRunLimit(String(saved.cadence_run_limit));
      setQuietHoursText(saved.quiet_hours.join(", "));

      setMessage({
        tone: "success",
        text: cadenceEnabled
          ? "Autopilot settings saved. Pulse can now queue approved drafts in the background."
          : "Automation settings saved. Pulse is currently in manual cadence mode.",
      });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not save automation settings" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">Automation Policy</div>
          <h2>Arm or disarm the cadence autopilot</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            In plain English: this decides whether the worker should quietly queue approved drafts on your behalf, how often it may do that, and what hours should stay off-limits.
          </p>
        </div>
        <span className="pill">{savedSettings.cadence_enabled ? "Autopilot armed" : "Manual only"}</span>
      </div>

      {message ? (
        <section className="status-note" style={{ marginBottom: 16, border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
          <strong>{message.tone === "error" ? "Action blocked" : "Settings saved"}</strong>
          <span className="muted">{message.text}</span>
        </section>
      ) : null}

      <form className="grid" style={{ gap: 12 }} onSubmit={handleSubmit}>
        <label className="checkbox-row">
          <input type="checkbox" checked={cadenceEnabled} onChange={(event) => setCadenceEnabled(event.target.checked)} disabled={busy} />
          <span>Let the worker run cadence automation in the background</span>
        </label>

        <div className="grid two">
          <label className="grid" style={{ gap: 6 }}>
            <small>Run cadence every X minutes</small>
            <input
              className="input"
              type="number"
              min={5}
              max={1440}
              value={cadenceIntervalMinutes}
              onChange={(event) => setCadenceIntervalMinutes(event.target.value)}
              disabled={busy}
            />
          </label>

          <label className="grid" style={{ gap: 6 }}>
            <small>Queue at most this many drafts per run</small>
            <input
              className="input"
              type="number"
              min={1}
              max={50}
              value={cadenceRunLimit}
              onChange={(event) => setCadenceRunLimit(event.target.value)}
              disabled={busy}
            />
          </label>
        </div>

        <label className="grid" style={{ gap: 6 }}>
          <small>Global quiet hours</small>
          <input
            className="input"
            value={quietHoursText}
            onChange={(event) => setQuietHoursText(event.target.value)}
            placeholder="22:30-07:00, 12:00-13:00"
            disabled={busy}
          />
        </label>

        <div className="project-meta">
          <span className="pill">Last run: {formatWhen(savedSettings.last_cadence_run_at)}</span>
          <span className="pill">{quietHours.length} quiet-hour windows</span>
        </div>

        <div className="button-row">
          <button type="submit" className="btn primary" disabled={busy}>
            Save automation policy
          </button>
        </div>
      </form>
    </section>
  );
}
